import IpcBase from './base'
import Application from '../application'
import StreamManager from '../helpers/streammanager'

interface startStreamArgs {
    type: string
    target: string
}

interface sendSdpArgs {
    sessionId: string,
    sdp: any
}

interface sendIceArgs {
    sessionId: string,
    ice: any
}
interface sendKeepaliveArgs {
    sessionId: string
}
interface stopStreamArgs {
    sessionId: string
}

interface activeSessionsArgs {
}

export default class IpcStreaming extends IpcBase {

    _streamManager:StreamManager

    constructor(application:Application){
        super(application)

        this._streamManager = new StreamManager(application)
    }

    startStream(args:startStreamArgs){
        return this._streamManager.startStream(args.type, args.target)
    }

    stopStream(args:stopStreamArgs){
        return this._streamManager.stopStream(args.sessionId)
    }

    sendSdp(args:sendSdpArgs){
        return this._streamManager.sendSdp(args.sessionId, args.sdp)
    }

    sendIce(args:sendIceArgs){
        return this._streamManager.sendIce(args.sessionId, args.ice)
    }

    sendKeepalive(args:sendKeepaliveArgs){
        return this._streamManager.sendKeepalive(args.sessionId)
    }

    activeSessions(args:activeSessionsArgs){
        return this._streamManager.getActiveSessions()
    }

}