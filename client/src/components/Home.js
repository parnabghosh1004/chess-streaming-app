import React, { useRef } from 'react'
import '../css/Home.css'
import { useHistory } from 'react-router-dom'

function Login() {

    const inputRef = useRef()
    const history = useHistory()

    const handleBtnClick = () => {

        const name = inputRef.current.value

        fetch('http://localhost:4000/join', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name
            }),
        }).then(res => res.json())
            .then(data => {
                history.push(`/game/${data.roomID}`)
            })
    }

    return (

        <div className='home'>
            <div className="home__container">
                <img src="https://i.pinimg.com/736x/3c/4f/18/3c4f1886e5b1d47f3126703fd20f56b7.jpg" alt="whatsapp" />
                <div className="home__text">
                    <h1>Welcome to Chess Streaming Arena</h1>
                </div>
                <div className="name">
                    <div class="input-group input-group-lg">
                        <input type="text" class="form-control" aria-label="Sizing example input" aria-describedby="inputGroup-sizing-lg" ref={inputRef} placeholder='Enter your name' />
                    </div>
                </div>
                <button onClick={handleBtnClick} className='btn btn-primary btn-lg'>
                    Go to streaming room
                </button>
            </div>
        </div>
    )
}

export default Login
