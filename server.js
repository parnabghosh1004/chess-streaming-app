const express = require('express')
const app = express()
const server = require('http').createServer(app)
const socketio = require('socket.io')
const path = require('path')
const { v4 } = require('uuid')
const port = process.env.PORT || 4000

app.use(express.json())
const io = socketio(server)

const rooms = {}
let counter = 0
let name
let roomID

app.post('/join', (req, res) => {
    name = req.body.name

    if (counter === 0) {
        counter = 1
        roomID = v4()
        rooms[roomID] = {}
        res.status(200).send({ roomID })
    }
    else {
        counter = 0
        res.status(200).send({ roomID })
    }
})

io.on('connection', socket => {
    socket.on('join-room', (roomId) => {
        if (!rooms[roomId]) {
            counter = 0
            return
        }
        socket.join(roomId)
        rooms[roomId][socket.id] = name
        io.to(socket.id).emit('your-id', socket.id)
        io.in(roomId).emit('player-connected', rooms[roomId])
        if (rooms[roomId]['side']) {
            io.to(socket.id).emit('setSide', rooms[roomId]['side'])
        }
        socket.on("callUser", (data) => {
            io.to(data.callingTo).emit('hey', { signal: data.signalData, from: data.from })
        })
        socket.on("acceptCall", (data) => {
            io.to(data.to).emit('callAccepted', data.signal)
        })
        socket.on("declineCall", () => {
            socket.to(roomId).emit('callDeclined')
        })
        socket.on("endCall", id => {
            io.to(id).emit('callEnds')
        })
        socket.on('cannotCall', () => {
            socket.to(roomId).emit('youCannotCall')
        })
        socket.on('canCall', () => {
            socket.to(roomId).emit('youCanCall')
        })
        socket.on('side', side => {
            rooms[roomId]['side'] = side
        })
        socket.on('i-moved', (obj, captured) => {
            socket.to(roomId).emit('opponent-moved', obj, captured)
        })
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected')
            delete rooms[roomId]
        })
    })
})

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/build'))
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
    })
}

server.listen(port, () => {
    console.log(`server is running on port ${port}`)
})