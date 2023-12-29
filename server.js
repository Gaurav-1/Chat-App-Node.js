const express = require('express');
const app = express();
const session= require('express-session');
const server = require('http').createServer(app);
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');
const {v4:uuid} = require('uuid');
const bodyParser = require('body-parser');

const io = new Server(server);

const dbDir=path.join(__dirname,'/DB');
const frontendDir=path.join(__dirname,'/FrontEnd')
const scriptDir=path.join(__dirname,'/Script/chat_script.js')

const user= {}

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.json())
app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
}))

app.get('/',(req,res)=>{
    if(req.session.userid){
        res.redirect('/chat')
        return;
    }
    res.sendFile(frontendDir+'/index.html');
})

app.post("/login",chk)

app.delete('/logout',logout_user)

app.get('/chat',show_chat);

app.post('/chat',insert_chat);

app.get('/Signup',(req,res)=>{
    if(req.session.userid)
        res.redirect('/chat')
    else
        res.sendFile(frontendDir+"/Signup.html")
})

app.post('/newUser',sav_user)

app.get('/chat_script.js',(req,res)=>{
    res.sendFile(scriptDir);
})

io.on('connection',(socket)=>{
    console.log("User connnected with id: ",socket.id);
    socket.on('disconnect',()=>{
        console.log('User disconnected with id: ',socket.id);
    })
    socket.on('joins room',(data)=>{

        const roomId = data.sendBy+'@'+data.sendTo;
        const roomId2 = data.sendTo+'@'+data.sendBy
        const file_data = JSON.parse(fs.readFileSync(dbDir+'/data.json','utf-8'))
        const existingRoom = file_data.find(item=>Object.keys(item)[0]===roomId||Object.keys(item)[0]===roomId2);
        let whichRoom;

        file_data.find(item=>{
            if(Object.keys(item)[0]===roomId){
                whichRoom=roomId
            }
            else if(Object.keys(item)[0]===roomId2){
                    whichRoom=roomId2
            }
        })
        
        if(!existingRoom){

            file_data.push({[roomId]:[{
                sender1: data.sendBy,
                sender2: data.sendTo
            }]})

            fs.writeFileSync(dbDir+'/data.json',JSON.stringify(file_data,null,2))
        }
        user[socket.id]={
            roomid: whichRoom
        };
        socket.join(whichRoom);

    })
    socket.on('chat-msg',insert_chat(socket))
    socket.on('user list',user_list(socket))
    socket.on('chat data',send_chat(socket))
})

server.listen(3000,(req,res)=>{
    console.log('Hearing port 3000')
})

function show_chat(req,res){
    if(req.session.userid)
        res.sendFile(frontendDir+'/chat.html')
    else
        res.redirect('/')
}

function send_chat(socket){
    return function (msg){
        const room=msg.sendBy+'@'+msg.sendTo;
        const room2 = msg.sendTo+'@'+msg.sendBy
        
        const chat_data=JSON.parse(fs.readFileSync(dbDir+'/data.json','utf-8'));
        let existingRoom = chat_data.find(item=>Object.keys(item)[0]===room);
        if(!existingRoom){
            existingRoom=chat_data.find(item=>Object.keys(item)[0]===room2)
        }
        if(!existingRoom){
            console.log('Room Not Exist');
            return;
        }
        
        const {roomid}=user[socket.id];
        io.to(roomid).emit('chat data reply',existingRoom)
    }
}

function user_list(socket){
    return function (msg){
        
        const data=JSON.parse(fs.readFileSync(dbDir+'/users.json','utf-8'))
        const users = data.filter(map=>map.userId!==msg)
        io.sockets.in(socket.id).emit('user list reply',users)}
}

function insert_chat(socket){
    return function (msg){
        const room=msg.sendBy+'@'+msg.sendTo;
        const room2 = msg.sendTo+'@'+msg.sendBy
        
        const chat_data=JSON.parse(fs.readFileSync(dbDir+'/data.json','utf-8'));
        let existingRoom = chat_data.find(item=>Object.keys(item)[0]===room);
        if(!existingRoom){
            existingRoom=chat_data.find(item=>Object.keys(item)[0]===room2)
        }
        if(!existingRoom){
            console.log('Room Not Exist');
            return;
        }
        let whichRoom;
        temp = chat_data.find(item=>{
            if(Object.keys(item)[0]===room){
                whichRoom = room;
            }
            else if(Object.keys(item)[0]===room2){
                whichRoom = room2;
            }
        })
        
        existingRoom[whichRoom].push({
            sendBy: msg.sendBy,
            msg: msg.msg
        })
        const res = {
            sendBy: msg.sendBy,
            msg: msg.msg
        }
        fs.writeFileSync(dbDir+'/data.json',JSON.stringify(chat_data,null,2));
        
        const {roomid}=user[socket.id];
        io.to(roomid).emit('reply',res)
        return;
}
}

function chk(req,res){
    console.log('enter');
    const username = req.body.username.toString().trim();
    const password = req.body.password.toString().trim();

    let data=JSON.parse(fs.readFileSync(dbDir+'/users.json','utf-8'))
console.log('at found');
    data=data.find(uname=>uname.username===username);
    console.log(data);
    if(data===undefined) res.status(404).josn({message: "User not exist"})
console.log('matching');
    let uname = data.username;
    let psswd = data.password;
    if(username===uname && password===psswd){
        req.session.username=data.disUsername;
        req.session.userid=data.id;
        console.log(req.session);
        res.status(200).json({user: req.session})
    }
    else res.status(301).json({message:'Invalid Username and Password'})
    console.log('exit');
}

function sav_user(req,res){
    console.log(req.body);
    const data = JSON.parse(fs.readFileSync(dbDir+'/users.json','utf-8'));
    if(data.length>0)
        if(data.find(uname=>uname.username===req.body.username)!==undefined)
            throw new Error('Username already exist')
        
        newdata={id:`${uuid()}`,disUsername: `${req.body.dis_usr}`,username:`${req.body.username}`,password:`${req.body.password}`}
        data.push(newdata);
        fs.writeFile(dbDir+'/users.json',JSON.stringify(data,null,2),(err)=>{
            if(err){
                res.josn('Signup error')
                return;
            }
            res.json('/')
            return
        })
}

function logout_user(req,res){
    req.session.destroy();
    res.redirect('/')
}