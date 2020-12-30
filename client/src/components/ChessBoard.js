import Chessboard from 'chessboardjsx'
import React, { useEffect, useRef, useState } from 'react'
import * as Chess from 'chess.js'
import a1 from '../sounds/Move.mp3'
import a2 from '../sounds/Capture.mp3'
import { useHistory } from 'react-router-dom'

export default function ChessBoard({ side, socket, showAlert }) {

    const [game, setGame] = useState(null)
    const [fenString, setFenString] = useState('start')
    const [selectedSquare, setSelectedSquare] = useState(null)
    const [squaresStyles, setSquaresStyles] = useState({})
    const [myTurn, setMyTurn] = useState(false)
    const audio1 = useRef()
    const audio2 = useRef()
    const history = useHistory()

    useEffect(() => {
        setGame(new Chess())
        audio1.current = new Audio(a1)
        audio2.current = new Audio(a2)
    }, [])

    useEffect(() => {
        if (side === 'white') setMyTurn(true)
        else setMyTurn(false)
    }, [side])

    useEffect(() => {
        if (game) {
            socket.on('opponent-moved', (obj, captured) => {
                if (captured) audio2.current.play()
                else audio1.current.play()
                game.move(obj)
                setFenString(game.fen())
                setSelectedSquare(null)
                setMyTurn(true)
            })
            socket.on('user-disconnected', () => {
                if (!game.game_over()) {
                    showAlert('Game Over, ', 'You won !', 'success')
                    setTimeout(() => {
                        history.push('/')
                    }, 4000)
                }
            })
        }
    }, [game])

    useEffect(() => {
        if (game) {
            if (myTurn) checkConditionsToMove()
            else checkConditionsWhoMoved()
        }
    }, [myTurn])

    const get_piece_positions = (game, piece) => {

        return [].concat(...game.board()).map((p, index) => {
            if (p !== null && p.type === piece.type && p.color === piece.color) {
                return index
            }
        }).filter(Number.isInteger).map((piece_index) => {
            const row = 'abcdefgh'[piece_index % 8]
            const column = Math.ceil((64 - piece_index) / 8)
            return row + column
        })

    }

    const KingSquare = () => {

        let color
        if (myTurn) {
            if (side === 'white') color = 'w'
            else color = 'b'
        }
        else {
            if (side === 'white') color = 'b'
            else color = 'w'
        }

        return get_piece_positions(game, { type: 'k', color: color })[0]
    }

    const checkConditionsWhoMoved = () => {
        if (game.in_check()) {
            let obj = {}
            obj[KingSquare()] = {
                background: 'radial-gradient(circle, #e70202 39%, transparent 100%)'
            }
            setSquaresStyles(obj)
        }

        if (game.game_over()) {
            if (game.in_checkmate()) {
                showAlert('Game Over, ', 'You won !', 'success')
            }
            else if (game.in_stalemate()) {
                showAlert('Game Over, ', 'Stalemate !', 'warning')
            }
            else if (game.in_draw()) {
                showAlert('Game Over, ', 'Draw !', 'primary')
            }
            setTimeout(() => {
                history.push('/')
            }, 4000)
        }
    }

    const checkConditionsToMove = () => {
        if (game.in_check()) {
            let obj1 = {}
            obj1[KingSquare()] = {
                background: 'radial-gradient(circle, #e70202 39%, transparent 100%)'
            }
            setSquaresStyles(obj1)
        }
        else {
            setSquaresStyles({})
        }
        if (game.game_over()) {
            if (game.in_checkmate()) {
                showAlert('Game Over, ', 'You lose !', 'danger')
            }
            else if (game.in_stalemate()) {
                showAlert('Game Over, ', 'Stalemate !', 'warning')
            }
            else if (game.in_draw()) {
                showAlert('Game Over, ', 'Draw !', 'primary')
            }
            setTimeout(() => {
                history.push('/')
            }, 4000)
        }
    }

    const handlePieceDrop = (obj) => {
        if (myTurn) {
            const move = game.move({ from: obj.sourceSquare, to: obj.targetSquare, promotion: 'q' })
            if (move) {
                setFenString(game.fen())
                if (move.san.includes('x')) {
                    audio2.current.play()
                    socket.emit('i-moved', { from: obj.sourceSquare, to: obj.targetSquare, promotion: 'q' }, true)
                }
                else {
                    audio1.current.play()
                    socket.emit('i-moved', { from: obj.sourceSquare, to: obj.targetSquare, promotion: 'q' }, false)
                }
                setSelectedSquare({ moves: game.moves({ square: obj.sourceSquare }), sq: obj.sourceSquare })
                setMyTurn(false)
            }
            if (game.in_check()) {
                let obj = {}
                obj[KingSquare()] = {
                    background: 'radial-gradient(circle, #e70202 39%, transparent 100%)'
                }
                setSquaresStyles(obj)
                return
            }
            setSquaresStyles({})
        }
    }

    const handleSquareClick = (sq) => {
        if (myTurn) {
            if (selectedSquare) {
                const move = game.move({ from: selectedSquare.sq, to: sq, promotion: 'q' })
                if (move) {
                    if (move.san.includes('x')) {
                        audio2.current.play()
                        socket.emit('i-moved', { from: selectedSquare.sq, to: sq, promotion: 'q' }, true)
                    }
                    else {
                        audio1.current.play()
                        socket.emit('i-moved', { from: selectedSquare.sq, to: sq, promotion: 'q' }, false)
                    }
                    setFenString(game.fen())
                    setSquaresStyles()
                    setMyTurn(false)
                }
                if (game.in_check()) {
                    let obj = {}
                    obj[KingSquare()] = {
                        background: 'radial-gradient(circle, #e70202 39%, transparent 100%)'
                    }
                    setSquaresStyles(obj)
                    return
                }
                setSquaresStyles({})
                setSelectedSquare(null)
                return
            }
            setSelectedSquare({ moves: game.moves({ square: sq }), sq })
        }
    }

    const handleMouseOverSquare = (sq) => {
        if (myTurn) {
            if (selectedSquare) return
            let obj = {}
            game.moves({ square: sq }).forEach(s => {

                if (s.length > 2) {
                    if (s[s.length - 1] === '+') s = s.replace('+', '')
                }
                s = `${s[s.length - 2]}${s[s.length - 1]}`

                obj[s] =
                {
                    background: "radial-gradient(circle, #0035f4 22%, transparent 26%)",
                    borderRadius: "50%"
                }
            })
            if (game.in_check()) {
                obj[KingSquare()] = {
                    background: 'radial-gradient(circle, #e70202 39%, transparent 100%)'
                }
            }
            setSquaresStyles(obj)
        }
    }

    return (
        <div className='chessBoard border border-dark border-3 my-2'>
            <Chessboard
                position={fenString}
                transitionDuration={50}
                onDrop={handlePieceDrop}
                onSquareClick={handleSquareClick}
                onMouseOverSquare={handleMouseOverSquare}
                squareStyles={squaresStyles}
                orientation={side}
            />
        </div>
    )
}
