let localStream;
let remoteStream;
let peerConnection;
let APP_ID = "9c4f519e610642649c2c53ff8469646a"

let token  = null;
let uid = String(Math.floor(Math.random() *1000))

let client;
let channel; 

let queryString = window.location.search
let params = new URLSearchParams(queryString)
let roomID = params.get('roomId')

if(!roomID){
    window.location = 'lobby.html'
}

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let createPeerConnection = async(MemberId)=>{
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream
    document.getElementById('user-2').style.display = 'block';


    if(!localStream){
    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
    document.getElementById('user-1').srcObject  = localStream;
    }

    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track,localStream)
    })

    peerConnection.ontrack = (event)=>{
        event.streams[0].getTracks().forEach((track)=>{
            console.log('track',track)
            remoteStream.addTrack(track)
        })
    }

    peerConnection.onicecandidate = async (event) =>{
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type' : 'candidate','candidate':event.candidate })},MemberId)
        }
    }
}

let init = async()=>{
    client = await AgoraRTM.createInstance(APP_ID)
    await client.login({uid,token})

    channel = client.createChannel(roomID)
    await channel.join()

    channel.on('MemberJoined' , handleUserJoined)

    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer',handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
    document.getElementById('user-1').srcObject  = localStream;
    
}
let handleMessageFromPeer =async (message,MemberId) =>{
    message = JSON.parse(message.text)
    
    if(message.type == 'offer'){
        createAnswer(MemberId,message.offer)
    console.log('offer',message.offer)

    }
 
    if(message.type == 'answer'){
        console.log('entered answer');
        addAnswer(message.answer)
    console.log('answer',message.answer)

    }
    
    if(message.type == 'candidate'){
        if(peerConnection){
            console.log('candidate',message.candidate);
            peerConnection.addIceCandidate(message.candidate)
    console.log('candidate',message.candidate)

        }
    }

}


let handleUserLeft = (MemberId)=>{
    document.getElementById('user-2').style.display = 'none'
}

let handleUserJoined = async(MemberId)=>{
    console.log( 'A new member joined' ,MemberId );
    createOffer(MemberId)
}

let createOffer = async(MemberId)=> {
   
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    client.sendMessageToPeer({text:JSON.stringify({'type' : 'offer','offer':offer})},MemberId)
    console.log('offer',offer)
        
    
}

let createAnswer = async(MemberId,offer)=>{
    console.log('somthing',offer)
    await createPeerConnection(MemberId)
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    console.log('create Answer',answer)

    client.sendMessageToPeer({text:JSON.stringify({'type' : 'answer','answer':answer})},MemberId)

    
}

let addAnswer = async(answer)=>{
    if(!peerConnection.currentRemoteDescription){
        console.log(answer,'remote')
        peerConnection.setRemoteDescription(answer)
    }else{
        console.log('error in addAnswer')
    }
}

let leaveChannel = async() =>{
    alert('left')
    await channel.leave()
    await client.logout()
}

let toggleCamera = async()=>{
    let video = localStream.getTracks().find(track=>track.kind === 'video')
    if(video.enabled){
        video.enabled = false
        document.getElementById('cam-btn').style.backgroundColor = 'rgba(246, 2, 2, 0.795)'
    }else{
        video.enabled = true
        document.getElementById('cam-btn').style.backgroundColor = 'lightgrey'


    }
}
document.getElementById('cam-btn').addEventListener('click', toggleCamera)
document.getElementById('callEnd-btn').addEventListener('click', leaveChannel)

window.addEventListener('beforeunload', leaveChannel)

init()