let localStream;
let remoteStream;
let peerConnection;
let APP_ID = "9c4f519e610642649c2c53ff8469646a"

let token  = null;
let uid = String(Math.floor(Math.random() *1000))

let client;
let channel; 

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

    if(!localStream){
    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
    document.getElementById('user-1').srcObject  = localStream;
    }

    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track,localStream)
    })

    peerConnection.ontrack = (event)=>{
        event.streams[0].getTracks().forEach((track)=>{
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

    channel = client.createChannel('main')
    await channel.join()

    channel.on('MemberJoined' , handleUserJoined)

    client.on('MessageFromPeer',handleMessageFromPeer)

    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:false})
    document.getElementById('user-1').srcObject  = localStream;
    
}
let handleMessageFromPeer =async (message,MemberId) =>{
    message = JSON.parse(message.text)
    
    if(message.type == 'offer'){
        createAnswer(MemberId,message.offer)
    console.log(message,'message',message.offer)

    }

    if(message.type == 'answer'){
        addAnswer(message.answer)
    console.log(message,'message',message.answer)

    }
    
    if(message.type == 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
    console.log(message,'message',message.candidate)

        }
    }

}
init()

let handleUserJoined = async(MemberId)=>{
    console.log( 'A new member joined' ,MemberId );
    createOffer(MemberId)
}

let createOffer = async(MemberId)=> {
   
    await createPeerConnection(MemberId)

    let offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    client.sendMessageToPeer({text:JSON.stringify({'type' : 'offer','offer':offer})},MemberId)
        
    
}

let createAnswer = async(MemberId,offer)=>{
    await createPeerConnection(MemberId)
    await peerConnection.setRemoteDescription(offer)
    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type' : 'answer','answer':answer})},MemberId)

    
}

let addAnswer = async(answer)=>{
    if(!peerConnection.currentRemoteDescription){
        console.log(answer,'remote')
        peerConnection.setRemoteDescription(answer)
    }
}