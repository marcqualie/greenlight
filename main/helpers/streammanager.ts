import Application from '../application'
import xCloudApi, { playResult } from './xcloudapi'

interface streamSession {
    id: string
    target: string,
    path: string
    type: string|'home'|'cloud'
    state?: string
    waitingTimes?: any
    errorDetails?: {
        code,
        message
    }
}

export default class StreamManager {

    _application:Application

    _sessions = {}
    
    constructor(application){
        this._application = application

        // setInterval(() => {

        // }, 30*1000)
    }

    getApi(type):xCloudApi{
        if(type === 'home'){
            return this._application._events._xHomeApi
        } else {
            return this._application._events._xCloudApi
        }
    }

    getSession(sessionId:string):streamSession {
        return this._sessions[sessionId]
    }

    startStream(type:string|'home'|'cloud', target){
        return new Promise((resolve, reject) => {
            this.getApi(type).startStream(target).then((playResult:playResult) => {
            // this._application._events._xCloudApi.startStream(type, target).then((playResult) => {
                console.log('Streammanager - startStream:', playResult)

                const sessionId = playResult.sessionPath.split('/')[3]

                const streamSession:streamSession = {
                    id: sessionId,
                    target: target,
                    path: playResult.sessionPath,
                    type: type,
                }
                this._sessions[sessionId] = streamSession
                this.monitorSession(sessionId)

                resolve(sessionId)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    stopStream(sessionId){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session == undefined){
                reject('Session not found: '+sessionId)
                return;
            }

            this.getApi(session.type).stopStream(sessionId).then((result) => {
                console.log('Current sessions:', this._sessions)
                delete this._sessions[sessionId]
                console.log('new sessions:', this._sessions)

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendSdp(sessionId:string, sdp:any){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session == undefined){
                reject('Session not found: '+sessionId)
                return;
            }

            this.getApi(session.type).sendSdp(sessionId, sdp).then((result) => {

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendIce(sessionId:string, ice:any){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session == undefined){
                reject('Session not found: '+sessionId)
                return;
            }

            this.getApi(session.type).sendIce(sessionId, ice).then((result) => {

                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    sendKeepalive(sessionId:string){
        return new Promise((resolve, reject) => {
            const session = this.getSession(sessionId)
            if(session == undefined){
                reject('Session not found: '+sessionId)
                return;
            }

            this.getApi(session.type).sendKeepalive(sessionId).then((result) => {
                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }

    monitorSession(sessionId){
        setTimeout(() => {
            this._application.log('StreamManager', 'monitorSession('+sessionId+') checking state')

            const session = this.getSession(sessionId)
            if(session == undefined){
            this._application.log('StreamManager', 'monitorSession('+sessionId+') session not found')
                return;
            }
            this.getApi(this.getSession(sessionId).type).getStreamState(sessionId).then((result:any) => {
                console.log('Streammanager - state:', result)

                this.getSession(sessionId).state = result.state

                if(result.state === 'Provisioned'){
                    // Do rest of handshake...
                    this._application._ipc._channels.streaming.send('streaming', {
                        action: 'startStreamResult',
                        id: 0,
                        data: this.getSession(sessionId)
                    })

                } else if(result.state === 'Provisioning'){
                    // Lets loop again
                    this.monitorSession(sessionId)

                } else if(result.state === 'ReadyToConnect'){
                    // Do MSAL Auth
                    this.getApi(this.getSession(sessionId).type).sendMSALAuth(sessionId, this._application._authentication._tokens.msal.token).then((result) => {
                        this.monitorSession(sessionId)

                    }).catch((error) => {
                        console.log('MSAL AUTH Error:', error)
                        alert('MSAL AUTH Error:'+ error)
                    })

                } else if(result.state === 'WaitingForResources'){
                    // Do Queue logic
                    if(this.getSession(sessionId).waitingTimes === undefined){
                        this.getApi(this.getSession(sessionId).type).getWaitingTimes(this.getSession(sessionId).target).then((waitingTimes) => {
                            this.getSession(sessionId).waitingTimes = waitingTimes

                            this._application._ipc._channels.streaming.send('streaming', {
                                action: 'onQueue',
                                id: 0,
                                data: waitingTimes
                            })
                        })
                    }
                    
                    this.monitorSession(sessionId)

                } else if(result.state === 'Failed'){
                    this.getSession(sessionId).errorDetails = result.errorDetails
                    this._application._ipc._channels.streaming.send('streaming', {
                        action: 'startStreamResult',
                        id: 0,
                        data: this.getSession(sessionId)
                    })

                } else {
                    
                    console.log('Unknown state:', result)
                }

            }).catch((error) => {
                console.log('Streammanager - error checking state:', sessionId, error)
                this.monitorSession(sessionId)
            })
        }, 1000)
    }

    getActiveSessions(){
        return new Promise((resolve, reject) => {
            this.getApi('cloud').getActiveSessions().then((result) => {

                console.log('Active sessions:', result)
                resolve(result)
            }).catch((error) => {
                reject(error)
            })
        })
    }
}