import { handle } from './match-bridge.mjs';

self.onmessage = ({data}) => {
    try {
        const {clip,...reply}=handle(JSON.parse(data));
        self.postMessage({reply:JSON.stringify(reply),clip},[clip.buffer]);
    } catch(error) {
        self.postMessage({reply:JSON.stringify({error:error.message})});
    }
};
