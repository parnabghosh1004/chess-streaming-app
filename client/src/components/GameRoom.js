import React, { useEffect, useRef, useState } from 'react'
import ChessBoard from './ChessBoard'
import socketClient from 'socket.io-client'
import { useHistory, useParams } from 'react-router-dom';
import '../css/GameRoom.css'
import Peer from 'simple-peer'

export default function GameRoom() {
    const ENDPOINT = "http://localhost:4000"
    const { roomID } = useParams()
    const [id, setId] = useState('')
    const [players, setPlayers] = useState({})
    const [stream, setStream] = useState()
    const [callAccepted, setCallAccepted] = useState(false)
    const [caller, setCaller] = useState("")
    const [callerSignal, setCallerSignal] = useState()
    const [camOn, setCamOn] = useState(false)
    const [recievingCall, setReceivingCall] = useState(false)
    const [peerObj, setPeerObj] = useState(undefined)
    const [pointer, setPointer] = useState('none')
    const [side, setSide] = useState('white')
    const socket = useRef()
    const myVideo = useRef()
    const opponentVideo = useRef()
    const history = useHistory()

    useEffect(() => {

        socket.current = socketClient(ENDPOINT, { transports: ['websocket'] })

        socket.current.emit('join-room', roomID)
        socket.current.on('your-id', (id) => {
            setId(id)
        })
        socket.current.on('player-connected', (p) => {
            delete p['side']
            setPlayers(p)
            if (Object.keys(p).length === 1) {
                const s = Math.floor(2 * Math.random()) ? 'black' : 'white'
                setSide(s)
                socket.current.emit('side', s)
            }
            if (Object.keys(p).length === 2) setPointer('auto')
        })
        socket.current.on('setSide', s => {
            if (s === 'black') setSide('white')
            else if (s === 'white') setSide('black')
        })
        socket.current.on('hey', (data) => {
            setReceivingCall(true)
            setCaller(data.from)
            setCallerSignal(data.signal)
            getMyVideo('accepter')
        })
        socket.current.on('callDeclined', () => {
            undoStates()
            showAlert('Sorry,', 'Your call has been declined !', 'danger')
        })
        socket.current.on('callEnds', () => {
            undoStates()
        })
        socket.current.on('youCanCall', () => {
            document.getElementById('setUp').disabled = false
        })
        socket.current.on('youCannotCall', () => {
            document.getElementById('setUp').disabled = true
        })
        if (sessionStorage.getItem('chessStreaming')) {
            history.push('/')
        }
        else {
            sessionStorage.setItem('chessStreaming', true)
        }

        return () => {
            alert('hello')
            undoStates()
            sessionStorage.removeItem('chessStreaming')
            socket.current.close()
        }

    }, [])

    const showAlert = (bold, msg, type) => {

        const alert = document.getElementById('alert')

        alert.innerHTML =
            `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <strong>${bold}</strong>${msg}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`
    }

    const getMyVideo = (a) => {

        if (a === 'caller') {
            socket.current.emit('cannotCall')
        }

        setCamOn(true)
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        }).then(stream => {
            setStream(stream)
            if (myVideo.current) {
                myVideo.current.srcObject = stream
            }
        })
    }

    const undoStates = () => {
        if (myVideo.current) {
            const s = myVideo.current.srcObject
            const tracks = s.getTracks()
            tracks.forEach(track => {
                track.stop()
            });
            myVideo.current.srcObject = null
        }
        setCallAccepted(false)
        setCaller('')
        setCallerSignal(undefined)
        setReceivingCall(false)
        peerObj?.destroy()
        setPeerObj(undefined)
        setCamOn(false)
        setStream(undefined)

        socket.current.off('callAccepted')

        const setUp = document.getElementById('setUp')
        if (setUp) setUp.disabled = false
    }

    const callPeer = () => {

        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream
        })
        document.getElementById('callingBtn').disabled = true
        document.getElementById('cancelBtn').style.display = 'none'
        setPeerObj(peer)

        peer.on('signal', data => {
            socket.current.emit("callUser", { callingTo: Object.keys(players).filter(n => n !== id)[0], signalData: data, from: players[id] })
        })

        peer.on('stream', stream => {
            if (opponentVideo.current) {
                opponentVideo.current.srcObject = stream
            }
        })

        socket.current.on("callAccepted", signal => {
            setCallAccepted(true)
            document.getElementById('endCall').disabled = false
            peer.signal(signal)
        })
    }

    const acceptCall = () => {
        setCallAccepted(true)
        setReceivingCall(false)
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
        })
        setPeerObj(peer)
        peer.on('signal', data => {
            socket.current.emit('acceptCall', { signal: data, to: Object.keys(players).filter(n => n !== id)[0] })
        })

        peer.on("stream", stream => {
            opponentVideo.current.srcObject = stream;
        });

        peer.signal(callerSignal)
    }

    const declineCall = () => {
        socket.current.emit('declineCall')
        undoStates()
    }

    const EndCall = () => {
        socket.current.emit('endCall', Object.keys(players).filter(n => n !== id)[0])
        undoStates()
    }

    const cancelCall = () => {
        socket.current.emit('canCall')
        undoStates()
    }

    return (
        <div id='game'>
            <div id='alert'></div>
            <div className='game__room' style={{ pointerEvents: pointer }}>
                <div className='game__roomBoard'>
                    <h1 className='fs-4 fw-bolder'>{Object.keys(players).length === 2 ? players[Object.keys(players).filter(n => n !== id)[0]] : 'loading ....!'}</h1>
                    {
                        (socket.current) && <ChessBoard side={side} socket={socket.current} showAlert={showAlert} />
                    }
                    <h1 className='fs-4 fw-bolder'>{players[id]}</h1>
                </div>
                <div className='game__roomVideoChat'>
                    <div className='video__chat'>
                        {
                            Object.keys(players).length === 2 && (
                                !camOn ?
                                    <button className='btn btn-dark' onClick={() => getMyVideo('caller')} id='setUp'>Set up Call</button>
                                    :
                                    (
                                        !callAccepted ?
                                            (!caller && !recievingCall) &&

                                            <div>
                                                <button className='btn btn-success me-1' onClick={callPeer} id='callingBtn'>Call {players[Object.keys(players).filter(n => n !== id)[0]]}</button>
                                                <button className='btn btn-danger ms-1' onClick={cancelCall} id='cancelBtn'>Cancel Call</button>
                                            </div>
                                            :
                                            <button className='btn btn-dark' onClick={EndCall} id='endCall'>End Call</button>
                                    )
                            )
                        }
                        <div id='video-grid'>
                            {
                                stream && <video muted ref={myVideo} playsInline autoPlay />
                            }
                            {
                                recievingCall &&
                                <div style={{ gridRow: 2, gridColumn: '1 / 3' }}>
                                    <br />
                                    <h1 className='fs-2'>{caller} is calling you ...</h1>
                                    <button className='btn btn-success me-1' onClick={acceptCall}>Accept</button>
                                    <button className='btn btn-danger ms-1' onClick={declineCall}>Decline</button>
                                </div>
                            }
                            {
                                callAccepted && <video ref={opponentVideo} playsInline autoPlay />
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
