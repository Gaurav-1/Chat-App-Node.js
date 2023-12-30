if(!JSON.parse(sessionStorage.getItem('user')).userid){
    window.location.href='/'
}

var socket = io();

socket.emit('user list',JSON.parse(sessionStorage.getItem('user')).userid)
socket.on('user list reply',disp_list)

document.querySelector('#current-user').innerHTML=JSON.parse(sessionStorage.getItem('user')).username;
function disp_list(res){
    console.log(res);
    const user_list=document.querySelector('#user-list');
    res.forEach(element => {
        const div = document.createElement('div');
        div.setAttribute('class','users')
        div.setAttribute('id',element.id)
        div.setAttribute('name',element.disUsername)
        div.innerHTML=`<h3 id='${element.userId}'>${element.username}</h3>`
        user_list.appendChild(div)
    });
    document.querySelectorAll('.users').forEach(item => item.addEventListener('click',start_chat))
}

function start_chat(){
    console.log(this);
    document.querySelector('#chat-to').innerHTML = document.getElementById(this.id).getAttribute('name');
    const sendBy=JSON.parse(sessionStorage.getItem('user')).userid
    const sendTo=this.id
    const chatObj = {
        sendBy: sendBy,
        sendTo: sendTo
    }
    socket.emit('joins room',chatObj)
    // document.querySelector('#chat_msg').innerHTML=''
    const msg_area=document.querySelector('#msg-area')
    msg_area.innerHTML=''
    msg_area.innerHTML=`
        <input type="text" id="chat_msg" name="chat_msg" placeholder="Type message here">
        <button class="chatBtn" id=${sendTo}>
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" style='fill:#175a07' viewBox="0 0 512 512">
                <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"/>
            </svg>
        </button>`
    document.querySelector('.chatBtn').addEventListener('click',chat)
    socket.emit('chat data',chatObj)
}

socket.on('chat data reply',display_chat);

function display_chat(resMsg){
    let room=Object.keys(resMsg)[0]
    let len=resMsg[room]
    const chat_box=document.querySelector('#chat-box')
    chat_box.innerHTML=''
    for (let i = 1; i < len.length; i++) {
        show_chat(len[i]);
    }
    chat_box.scrollTop=chat_box.scrollHeight
}

function chat(event){
    event.preventDefault();
    const chats=document.querySelector('#chat_msg');
    if(!chats.value.trim()){
        alert('Please enter a message first');
        return;
    }
    const chatObj = {
        sendBy: JSON.parse(sessionStorage.getItem('user')).userid,
        sendTo: this.id,
        msg: chats.value
    }
    console.log(chatObj);
    socket.emit('chat-msg',chatObj)
    chats.value=''
}
socket.on('reply',show_chat)

function show_chat(resMsg){
    const userid=JSON.parse(sessionStorage.getItem('user')).userid
    const classes=(resMsg.sendBy===userid)?'user':'other'
    const div = document.createElement('div')
    div.setAttribute('class','chat-item')
    div.innerHTML=`<h3 class='${classes}'>${resMsg.msg}</h3>`
    document.getElementById('chat-box').appendChild(div)
    const chat_box = document.querySelector('#chat-box');
    chat_box.scrollTop=chat_box.scrollHeight
    return;
}

document.querySelector('#logoutBtn').addEventListener('click',(e)=>{
    fetch('/logout',{
        method: 'DELETE'
    }).then(()=>{
        sessionStorage.clear();
        window.location.href='/'
    })
})