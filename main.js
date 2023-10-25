let localStream;
let remoteStream;
let peerConnection;
let APP_ID = "9c4f519e610642649c2c53ff8469646a"

let token  = null;
let uid = String(Math.floor(Math.random() *1000))

let client;
let channel; 
let isRemoteAdded;

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

async function createPeerConnection(MemberId) {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;
    document.getElementById('user-2').style.display = 'block';

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById('user-1').srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        document.getElementById('user-2').srcObject = remoteStream;
    };

    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({
                text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }),
            }, MemberId);
        }
    };
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
        try {
            handleReceivedIceCandidate(message.candidate)
            
        } catch (error) {
            console.log(error);
            
        }
    

      
    }

}

async function handleReceivedIceCandidate(candidate) {
    if (peerConnection.remoteDescription) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
           
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    } else {
        console.log('waiting for connection')
            setTimeout(() => {
                handleReceivedIceCandidate(candidate); 
              }, 1000); 
    }
}


let handleUserLeft = (MemberId)=>{
    document.getElementById('user-2').style.display = 'none'
}

let handleUserJoined = async(MemberId)=>{
   
    createOffer(MemberId)
}

let createOffer = async(MemberId)=> {
   
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    client.sendMessageToPeer({text:JSON.stringify({'type' : 'offer','offer':offer})},MemberId)
   
        
    
}

async function createAnswer(MemberId, offer) {
   
    await createPeerConnection(MemberId);

    try {
        await peerConnection.setRemoteDescription(offer);
        

        let answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        client.sendMessageToPeer({
            text: JSON.stringify({ 'type': 'answer', 'answer': answer }),
        }, MemberId);
    } catch (error) {
        console.error('Error setting remote description or creating answer:', error);
    }
}   

async function addAnswer(answer) {
    try {
        await peerConnection.setRemoteDescription(answer);
       
    } catch (error) {
        console.error('Error setting remote description:', error);
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