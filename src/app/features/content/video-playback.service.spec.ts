import { TestBed } from '@angular/core/testing';
import { PLAYER_ORIGIN, VideoPlaybackService, playerState } from './video-playback.service';

describe('playerState', () => {
  it('reads the state from a state change or an info update', () => {
    expect(playerState('{"event":"onStateChange","info":1}')).toBe(1);
    expect(playerState('{"event":"infoDelivery","info":{"playerState":2,"currentTime":4}}')).toBe(2);
  });

  it('returns null for anything that carries no state', () => {
    expect(playerState('{"event":"infoDelivery","info":{"currentTime":4}}')).toBeNull();
    expect(playerState('{"event":"onReady","info":null}')).toBeNull();
    expect(playerState('not json')).toBeNull();
    expect(playerState('null')).toBeNull();
    expect(playerState({ event: 'onStateChange', info: 1 })).toBeNull();
  });
});

describe('VideoPlaybackService', () => {
  const frames: HTMLIFrameElement[] = [];

  /** A player on the page, with its outgoing messages recorded. */
  const addFrame = () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    frames.push(frame);
    const post = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation(() => undefined);
    const sent = () => post.mock.calls.map(([data]) => JSON.parse(data as string));
    const pauses = () => sent().filter((message) => message.func === 'pauseVideo').length;
    return { frame, post, sent, pauses };
  };

  /** A message from the player in this frame, as YouTube sends it. */
  const report = (frame: HTMLIFrameElement, data: object, origin = PLAYER_ORIGIN) => {
    window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data), origin, source: frame.contentWindow }));
  };

  let service: VideoPlaybackService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    service = TestBed.inject(VideoPlaybackService);
  });

  afterEach(() => {
    vi.useRealTimers();
    frames.splice(0).forEach((frame) => frame.remove());
  });

  it('pauses the clips already open when a new one opens, and never the new one', () => {
    const first = addFrame();
    const second = addFrame();
    service.register(first.frame);
    service.register(second.frame);
    expect(first.pauses()).toBe(1);
    expect(second.pauses()).toBe(0);
    expect(first.post).toHaveBeenCalledWith(expect.any(String), PLAYER_ORIGIN);
  });

  it('pauses the others when a clip starts from its own play button, once per start', () => {
    const first = addFrame();
    const second = addFrame();
    service.register(first.frame);
    service.register(second.frame);
    report(first.frame, { event: 'onStateChange', info: 1 });
    report(first.frame, { event: 'infoDelivery', info: { playerState: 1 } });
    expect(second.pauses()).toBe(1);
    expect(first.pauses()).toBe(1);

    report(first.frame, { event: 'onStateChange', info: 2 });
    report(first.frame, { event: 'onStateChange', info: 1 });
    expect(second.pauses()).toBe(2);
  });

  it('leaves the others alone when a clip pauses or ends', () => {
    const first = addFrame();
    const second = addFrame();
    service.register(first.frame);
    service.register(second.frame);
    report(first.frame, { event: 'onStateChange', info: 2 });
    report(first.frame, { event: 'onStateChange', info: 0 });
    expect(second.pauses()).toBe(0);
  });

  it('ignores messages from other sites and from frames it does not know', () => {
    const first = addFrame();
    const second = addFrame();
    const stranger = addFrame();
    service.register(first.frame);
    service.register(second.frame);
    report(second.frame, { event: 'onStateChange', info: 1 }, 'https://example.com');
    report(stranger.frame, { event: 'onStateChange', info: 1 });
    expect(first.pauses()).toBe(1);
  });

  it('stops sending to a clip once it is closed', () => {
    const first = addFrame();
    const second = addFrame();
    const forget = service.register(first.frame);
    service.register(second.frame);
    forget();
    report(second.frame, { event: 'onStateChange', info: 1 });
    service.register(addFrame().frame);
    expect(first.pauses()).toBe(1);
  });

  it('asks a loaded player to report until it answers, then asks for its state changes', () => {
    vi.useFakeTimers();
    const clip = addFrame();
    service.register(clip.frame);
    clip.frame.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(750);
    expect(clip.sent().filter((message) => message.event === 'listening')).toHaveLength(3);
    expect(clip.sent()[0]).toEqual({ event: 'listening', id: expect.any(Number), channel: 'widget' });

    report(clip.frame, { event: 'onReady', info: null });
    vi.advanceTimersByTime(1000);
    expect(clip.sent().filter((message) => message.event === 'listening')).toHaveLength(3);
    expect(clip.sent().at(-1)).toMatchObject({ event: 'command', func: 'addEventListener', args: ['onStateChange'] });
  });

  it('gives up asking a player that never answers', () => {
    vi.useFakeTimers();
    const clip = addFrame();
    service.register(clip.frame);
    clip.frame.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(60_000);
    expect(clip.sent()).toHaveLength(40);
  });
});
