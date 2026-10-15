/**
 * TEMPORARY Unsplash placeholder images used by the seed script.
 * Replace them in the CMS (or change the URLs here and re-seed) with real
 * Royal Bee photos. Every seeded image is flagged `isPlaceholder: true`.
 */
const u = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const img = (id, alt, w) => ({ url: u(id, w), alt, isPlaceholder: true });

export const IMAGES = {
  // Film sets & crews
  clapperRoadside: img('photo-1485846234645-a62644f84728', 'Clapperboard on a roadside film set'),
  soundstageCrew: img('photo-1612544409025-e1f6a56c1152', 'Film crew working on a lit soundstage'),
  clapperHands: img('photo-1515634928627-2a4e0dae3ddf', 'Crew member holding a clapperboard'),
  crewAroundCamera: img('photo-1632187981988-40f3cbaeef5e', 'Crew gathered around a cinema camera'),
  clapperPortrait: img('photo-1594909122845-11baa439b7bf', 'Actor holding a clapper in front of her face'),
  crewAroundCamera2: img('photo-1632187989763-c9c620420b4d', 'Production team setting up a camera'),
  studioSetup: img('photo-1471341971476-ae15ff5dd4ea', 'Camera and lighting set up in a studio'),
  stageSilhouette: img('photo-1603126004372-e63e3b53934b', 'Silhouettes on a lit stage'),
  operatorCamera: img('photo-1611784728558-6c7d9b409cdf', 'Camera operator holding a video camera'),
  steadicamMonitors: img('photo-1682146717223-874ac7dcc607', 'Steadicam monitors during a commercial shoot'),
  fieldWalk: img('photo-1580746353748-e7b3febae39a', 'Two people walking across a golden field'),
  crewInDark: img('photo-1681137063068-081072cf04b4', 'Crew around a camera during a night shoot'),
  videoCamera: img('photo-1518930259200-3e5b29f42096', 'Black digital cinema camera'),
  crewSitting: img('photo-1638545818407-ac7a54b544fd', 'Crew seated around a camera between takes'),
  cameraTrack: img('photo-1692268455127-dbe332c48760', 'Filmmaker with a camera on a track'),

  // Cinema & post
  cinemaAudience: img('photo-1517604931442-7e0c8ed2963c', 'Audience watching a film in a cinema'),
  projector: img('photo-1478720568477-152d9b164e26', 'Projector beam in a dark room'),
  cinemaHall: img('photo-1536440136628-849c177e76a1', 'Cinema hall with a lit screen'),
  filmReel: img('photo-1518676590629-3dcbd9c5a5c9', 'Close-up of motion picture film reel'),
  twoReels: img('photo-1440404653325-ab127d49abc1', 'Two vintage film reels'),
  cinemaScreen: img('photo-1485095329183-d0797cdc5676', 'Audience facing a bright cinema screen'),

  // Portraits (placeholder founder imagery)
  founderPortrait: img('photo-1531384441138-2736e62e0919', 'Placeholder founder portrait', 1200),
  founderWithCamera: img('photo-1531384698654-7f6e477ca221', 'Placeholder: founder with a camera', 1200),
  founderMonochrome: img('photo-1558730234-d8b2281b0d00', 'Placeholder: monochrome portrait', 1200),
  founderOnSet: img('photo-1614760553312-4fde8eb121bc', 'Placeholder: founder on set with a camera', 1200),
  founderDirecting: img('photo-1624351087886-dba087f913d5', 'Placeholder: founder in the director\'s chair', 1200),
  founderTeam: img('photo-1624351088510-0b6c2eb9cd12', 'Placeholder: founder reviewing footage with a colleague', 1200),
  founderSunset: img('photo-1642722646714-d75d41824883', 'Placeholder: silhouette at sunset', 1200),
};
