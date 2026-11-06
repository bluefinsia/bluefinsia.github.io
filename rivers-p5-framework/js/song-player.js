/** Optional recorded Đi Cấy clips. Text clues work without a supplied recording. */
export class SongPlayer {
  constructor() { this.context=null; this.source=null; this.buffers=new Map(); }
  async unlock() {
    const Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio) return;
    this.context ||= new Audio();
    if(this.context.state==='suspended') await this.context.resume();
  }
  async play(path) {
    if(!path || !this.context) return false;
    try {
      if(!this.buffers.has(path)) {
        const response=await fetch(path);
        if(!response.ok) throw new Error('Song recording could not be loaded.');
        this.buffers.set(path,await this.context.decodeAudioData(await response.arrayBuffer()));
      }
      this.source?.stop();
      this.source=this.context.createBufferSource();
      this.source.buffer=this.buffers.get(path);
      const gain=this.context.createGain(); gain.gain.value=0.55;
      this.source.connect(gain).connect(this.context.destination); this.source.start();
      return true;
    } catch(error) { console.warn('Optional song recording:',error.message); return false; }
  }
  stop() { this.source?.stop(); this.source=null; }
}
