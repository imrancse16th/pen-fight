/* PEN FIGHT — shared UI kit (pure code, no raster art) */
(function(){
const PF=window.PF={};

/* ---------------- icons (inline SVG, 24x24) ---------------- */
const I={
coin:'<circle cx="12" cy="12" r="10" fill="#f6b400" stroke="#a66a00" stroke-width="1.5"/><circle cx="12" cy="12" r="7.3" fill="#ffd93d" stroke="#d99100"/><text x="12" y="16.5" font-size="11" font-weight="800" text-anchor="middle" fill="#a66a00" font-family="Poppins,sans-serif">$</text>',
gem:'<path d="M6 3h12l4 6-10 12L2 9z" fill="#35c8ff" stroke="#0b6fb8" stroke-width="1.2"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6" fill="none" stroke="#bff0ff" stroke-width="1"/><path d="M6 3l3 6h6l3-6" fill="#8be3ff" opacity=".7"/>',
plus:'<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
home:'<path d="M3 11.5 12 3l9 8.5V21h-6v-6H9v6H3z" fill="currentColor"/>',
back:'<path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
fwd:'<path d="M9 4l8 8-8 8" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
down:'<path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
play:'<path d="M7 4v16l14-8z" fill="currentColor"/>',
gear:'<path fill="currentColor" d="M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6c-.6.2-1.2.6-1.7 1l-2.5-1-2 3.5L6.5 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.8 1.7 1l.4 2.6h4l.4-2.6c.6-.2 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/>',
bell:'<path d="M12 2a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V8a6 6 0 0 0-6-6zm-2 17a2 2 0 0 0 4 0z" fill="currentColor"/>',
mail:'<path d="M3 5h18v14H3z" fill="currentColor"/><path d="M3 6l9 7 9-7" fill="none" stroke="#1a2040" stroke-width="2"/>',
mic:'<rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4" fill="none" stroke="currentColor" stroke-width="2"/>',
speaker:'<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
pause:'<rect x="5" y="3" width="5" height="18" rx="1.5" fill="currentColor"/><rect x="14" y="3" width="5" height="18" rx="1.5" fill="currentColor"/>',
check:'<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>',
x:'<path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>',
lock:'<rect x="5" y="10" width="14" height="11" rx="2.5" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/>',
trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#ffc61a" stroke="#b87400" stroke-width="1"/><path d="M7 5H3c0 4 2 6 4 6M17 5h4c0 4-2 6-4 6" fill="none" stroke="#ffc61a" stroke-width="2"/><path d="M12 14v4M8 21h8l-1-3H9z" fill="#ffc61a" stroke="#b87400"/>',
gamepad:'<path d="M6 7h12a5 5 0 0 1 5 5l-1 5a3 3 0 0 1-5 1l-2-2H9l-2 2a3 3 0 0 1-5-1l-1-5a5 5 0 0 1 5-5z" fill="currentColor"/><path d="M7 10v4M5 12h4" stroke="#222" stroke-width="1.8"/><circle cx="16" cy="11" r="1.2" fill="#222"/><circle cx="18.5" cy="13" r="1.2" fill="#222"/>',
users:'<circle cx="9" cy="8" r="4" fill="currentColor"/><path d="M1 21c0-5 3.5-7 8-7s8 2 8 7z" fill="currentColor"/><circle cx="18" cy="9" r="3" fill="currentColor" opacity=".75"/><path d="M18 14c3 0 5 1.8 5 5.5h-4.5c0-2-.5-4-.5-5.5z" fill="currentColor" opacity=".75"/>',
user:'<circle cx="12" cy="8" r="4.5" fill="currentColor"/><path d="M3 21c0-5 4-7.5 9-7.5s9 2.5 9 7.5z" fill="currentColor"/>',
wifi:'<path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="20" r="1.8" fill="currentColor"/>',
clock:'<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 6v6l4 2.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
bars:'<rect x="3" y="13" width="4" height="8" rx="1" fill="currentColor"/><rect x="10" y="8" width="4" height="13" rx="1" fill="currentColor"/><rect x="17" y="3" width="4" height="18" rx="1" fill="currentColor"/>',
chart:'<rect x="3" y="12" width="4.5" height="9" rx="1" fill="currentColor"/><rect x="9.8" y="7" width="4.5" height="14" rx="1" fill="currentColor"/><rect x="16.5" y="3" width="4.5" height="18" rx="1" fill="currentColor"/>',
pencil:'<path d="M3 21l1.5-5L16 4.5l3.5 3.5L8 19.5z" fill="currentColor"/><path d="M14.5 6l3.5 3.5" stroke="#1a2040" stroke-width="1.5"/>',
edit:'<path d="M3 21l1.5-5L16 4.5l3.5 3.5L8 19.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
star:'<path d="M12 2l3 6.5 7 .9-5.2 4.8 1.4 7L12 17.7 5.8 21.2l1.4-7L2 9.4l7-.9z" fill="currentColor"/>',
crown:'<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>',
gift:'<rect x="3" y="9" width="18" height="12" rx="1.5" fill="currentColor"/><rect x="2" y="6" width="20" height="4.5" rx="1" fill="currentColor"/><path d="M12 6v15" stroke="#7a3d00" stroke-width="2.2"/><path d="M12 6C9 1 5 3 7 5.5 8 6 12 6 12 6zm0 0c3-5 7-3 5 -.5-1 .5-5 .5-5 .5z" fill="none" stroke="currentColor" stroke-width="2"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5" fill="#fff" stroke="currentColor" stroke-width="2"/><rect x="3" y="5" width="18" height="5" fill="#e33"/><path d="M8 3v4M16 3v4" stroke="#444" stroke-width="2.2" stroke-linecap="round"/><path d="M7 14l2 2 3-3M14 14l2 2" stroke="#2a9d3f" stroke-width="1.8" fill="none"/>',
target:'<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
bolt:'<path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/>',
shield:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor"/>',
fist:'<path d="M6 10V6a2 2 0 0 1 4 0v-1a2 2 0 0 1 4 0v1a2 2 0 0 1 4 1v7a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z" fill="currentColor"/>',
cross:'<path d="M4 4l16 16M20 4L4 20" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>',
swords:'<path d="M4 4l10 10M20 4L10 14M14 14l3 3M10 14l-3 3" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M3 20l3-3M21 20l-3-3" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
globe:'<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2.5 12h19M12 2.5c4 3 4 16 0 19M12 2.5c-4 3-4 16 0 19" fill="none" stroke="currentColor" stroke-width="1.8"/>',
copy:'<rect x="8" y="8" width="12" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M4 16V5a2 2 0 0 1 2-2h9" fill="none" stroke="currentColor" stroke-width="2.4"/>',
eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>',
palette:'<path d="M12 3a9 9 0 1 0 0 18c2 0 2-1.5 1-3s0-3 2-3h3a3 3 0 0 0 3-3C21 7 17 3 12 3z" fill="currentColor"/><circle cx="7.5" cy="11" r="1.4" fill="#222"/><circle cx="10" cy="7" r="1.4" fill="#222"/><circle cx="15" cy="7" r="1.4" fill="#222"/>',
box:'<path d="M12 2l9 4.5v11L12 22 3 17.5v-11z" fill="currentColor"/><path d="M3 6.5l9 4.5 9-4.5M12 11v11" stroke="#1a2040" stroke-width="1.6" fill="none"/>',
recycle:'<path d="M8 4l3-2 2 4M20 10l2 4-4 1M6 20l-3-2 3-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M11 3L5 12h4M18 12l-4 7H8M17 5l4 7-4 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
sparkle:'<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor"/>',
tools:'<path d="M4 20L14 10M16 4a4 4 0 0 0 4 4l-3 1-2-2z" stroke="currentColor" stroke-width="3" fill="currentColor" stroke-linecap="round"/><path d="M20 20L10 10 7 7 4 4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
map:'<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z" fill="#ffc61a"/><path d="M9 3v16M15 5v16" stroke="#b87400" stroke-width="1.4"/><circle cx="16" cy="9" r="3" fill="#e33"/>',
flag:'<path d="M5 22V3M5 4h13l-3 4 3 4H5" fill="currentColor" stroke="currentColor" stroke-width="2"/>',
cart:'<path d="M2 3h3l3 12h11l2-8H7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="20" r="1.8" fill="currentColor"/><circle cx="18" cy="20" r="1.8" fill="currentColor"/>',
search:'<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
chat:'<path d="M3 4h18v12H10l-5 4v-4H3z" fill="currentColor"/>',
help:'<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M9 9a3 3 0 1 1 4 2.8c-1 .5-1 1.2-1 2.2" fill="none" stroke="#1a2040" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.4" fill="#1a2040"/>',
exit:'<path d="M10 3H4v18h6M14 8l4 4-4 4M18 12H8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
camera:'<rect x="2" y="6" width="14" height="12" rx="2.5" fill="currentColor"/><path d="M16 10l6-3v10l-6-3z" fill="currentColor"/>',
refresh:'<path d="M20 11a8 8 0 1 0-2 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M20 3v6h-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
up2:'<path d="M5 12l7-7 7 7M5 19l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
chev:'<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
qr:'<path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M8 12h8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
fire:'<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 2 3-1z" fill="#ff7a1a"/><path d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-2 3-5z" fill="#ffd23c"/>',
skull:'<path d="M12 3a8 8 0 0 0-8 8c0 3 1 4 3 5v4h10v-4c2-1 3-2 3-5a8 8 0 0 0-8-8z" fill="currentColor"/><circle cx="9" cy="11.5" r="2" fill="#1a2040"/><circle cx="15" cy="11.5" r="2" fill="#1a2040"/>',
bagi:'<path d="M7 7a5 5 0 0 1 10 0v2h2v12H5V9h2z" fill="currentColor"/>',
rocket:'<path d="M12 2c4 3 5 8 3 14h-6C7 10 8 5 12 2z" fill="currentColor"/><circle cx="12" cy="9" r="2" fill="#1a2040"/><path d="M9 16l-3 4 3-1zM15 16l3 4-3-1z" fill="currentColor"/>',
};
PF.icon=(n,c)=>`<svg viewBox="0 0 24 24" ${c?`style="color:${c}"`:''}>${I[n]||I.star}</svg>`;

/* ---------------- painted campus scene ---------------- */
function sceneSVG(kind){
  const trunk=`<path d="M60 0c40 120 10 380 40 520h130c-30-160 20-380-10-520z" fill="#4a3320" opacity=".85"/>`;
  const leaves=[...Array(46)].map((_,i)=>{
    const x=(i*97)%720, y=(i*53)%300, r=70+((i*37)%90), c=['#2c5e1f','#3f7a22','#6aa32e','#9fc34a','#27501b'][i%5];
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".9"/>`;}).join('');
  const leavesR=[...Array(34)].map((_,i)=>{
    const x=700+(i*83)%1000, y=-20+(i*41)%230, r=60+((i*29)%70), c=['#2c5e1f','#4a8a26','#78ae34','#a8cc58'][i%4];
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".88"/>`;}).join('');
  const wins=[...Array(18)].map((_,i)=>`<rect x="${1395+(i%6)*44}" y="${255+Math.floor(i/6)*105}" width="26" height="58" fill="#6a4a42" opacity=".85"/>`).join('');
  const grain=[...Array(26)].map((_,i)=>`<path d="M0 ${760+i*7} Q ${400+i*20} ${748+i*7+((i%3)-1)*8} 836 ${762+i*7} T 1672 ${758+i*7}" stroke="rgba(60,25,8,${.12+(i%4)*.05})" stroke-width="${1+(i%3)}" fill="none"/>`).join('');
  const kids=[...Array(7)].map((_,i)=>`<g transform="translate(${1380+i*34} ${560+(i%3)*18})"><circle cx="0" cy="0" r="13" fill="#8a5a3c"/><path d="M-20 14h40v70h-40z" fill="${i%2?'#e6e9f2':'#bcd0ea'}"/></g>`).join('');
  return `<svg viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eb0ec"/><stop offset=".55" stop-color="#bfe0f1"/><stop offset="1" stop-color="#efd9b4"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98a45"/><stop offset=".35" stop-color="#b9632a"/><stop offset="1" stop-color="#6e3416"/></linearGradient>
<linearGradient id="bld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b3a0"/><stop offset="1" stop-color="#c88672"/></linearGradient>
<radialGradient id="sun" cx=".6" cy=".1" r=".6"><stop offset="0" stop-color="#fff7d0" stop-opacity=".95"/><stop offset="1" stop-color="#fff7d0" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<filter id="bl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="bl2"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<rect width="1672" height="941" fill="url(#sky)"/>
<g filter="url(#bl)">
 <rect x="1300" y="140" width="420" height="520" fill="url(#bld)"/>
 <rect x="1280" y="120" width="440" height="40" fill="#b45f48"/>
 <rect x="1420" y="170" width="250" height="70" fill="#efdccb"/>
 <text x="1545" y="222" font-size="34" font-weight="800" text-anchor="middle" fill="#8c7468" font-family="Poppins">KYAU</text>
 ${wins}
 <rect x="1310" y="520" width="410" height="14" fill="#f1e2d4"/>
 ${[0,1,2,3,4].map(i=>`<rect x="${1330+i*85}" y="540" width="16" height="110" fill="#f1e2d4"/>`).join('')}
 <rect x="1612" y="20" width="6" height="150" fill="#555"/><rect x="1570" y="30" width="46" height="30" fill="#0a7a3d"/>
 ${kids}
 <rect x="0" y="560" width="1672" height="120" fill="#7f9a46" opacity=".75"/>
 <rect x="0" y="640" width="1672" height="110" fill="#5b3c28"/>
 ${trunk}${leaves}${leavesR}
 <rect width="1672" height="941" fill="url(#sun)"/>
</g>
<path d="M0 735 L1672 735 L1672 941 L0 941z" fill="url(#wood)"/>
<rect y="735" width="1672" height="5" fill="#f0b676" opacity=".7"/>
${grain}
<ellipse cx="600" cy="800" rx="520" ry="55" fill="#ffd9a0" opacity=".13"/>
<rect width="1672" height="941" fill="url(#vig)"/>
</svg>`;
}
function scenePortrait(){
  const leaves=[...Array(40)].map((_,i)=>{const x=(i*83)%1000,y=(i*47)%330,r=60+((i*31)%80),c=['#2c5e1f','#3f7a22','#6aa32e','#9fc34a','#27501b'][i%5];return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".9"/>`}).join('');
  const wins=[...Array(12)].map((_,i)=>`<rect x="${700+(i%4)*52}" y="${330+Math.floor(i/4)*95}" width="30" height="58" fill="#6a4a42" opacity=".8"/>`).join('');
  const grain=[...Array(40)].map((_,i)=>`<path d="M0 ${830+i*21} Q 470 ${815+i*21+((i%3)-1)*10} 941 ${832+i*21}" stroke="rgba(60,25,8,${.12+(i%4)*.05})" stroke-width="${1+(i%3)}" fill="none"/>`).join('');
  return `<svg viewBox="0 0 941 1672" preserveAspectRatio="xMidYMid slice"><defs>
<linearGradient id="skyp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eb0ec"/><stop offset=".5" stop-color="#bfe0f1"/><stop offset="1" stop-color="#efd9b4"/></linearGradient>
<linearGradient id="woodp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98a45"/><stop offset=".25" stop-color="#b9632a"/><stop offset="1" stop-color="#6e3416"/></linearGradient>
<linearGradient id="bldp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b3a0"/><stop offset="1" stop-color="#c88672"/></linearGradient>
<filter id="blp"><feGaussianBlur stdDeviation="6"/></filter></defs>
<rect width="941" height="1672" fill="url(#skyp)"/>
<g filter="url(#blp)">
<rect x="690" y="230" width="300" height="420" fill="url(#bldp)"/><rect x="670" y="205" width="320" height="36" fill="#b45f48"/>
<rect x="720" y="250" width="200" height="60" fill="#efdccb"/><text x="820" y="292" font-size="28" font-weight="800" text-anchor="middle" fill="#8c7468" font-family="Poppins">KYAU</text>${wins}
<rect x="0" y="640" width="941" height="180" fill="#6b8a40" opacity=".7"/><rect x="0" y="700" width="941" height="110" fill="#5b3c28"/>
<rect x="0" y="0" width="200" height="720" fill="#d8cfc0"/><path d="M200 0h50v720h-50z" fill="#3a2a1e"/>
${leaves}
</g>
<rect y="790" width="941" height="882" fill="url(#woodp)"/><rect y="790" width="941" height="6" fill="#f0b676" opacity=".7"/>${grain}
</svg>`;
}
PF.scene=k=>{const P=k&&k.indexOf('portrait')>=0;return `<div class="scene ${k||''}">${P?scenePortrait():sceneSVG(k)}<div class="shade"></div></div>`};

/* ---------------- characters ---------------- */
function head(o){
  o=Object.assign({skin:'#e0a06c',hair:'#1b130e',glasses:0,smile:1,band:0,cap:0,sun:0,long:0,beard:0,hp:1,open:0,bg:['#d9a0ff','#7a4fd0']},o||{});if(o.bg===0)o.bg=null;
  const id='a'+Math.random().toString(36).slice(2,7);
  return `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${(o.bg||[])[0]}"/><stop offset="1" stop-color="${(o.bg||[])[1]}"/></linearGradient></defs>
${o.bg?`<rect width="200" height="200" fill="url(#${id})"/>`:''}
${o.long?`<path d="M38 70c-10 40-8 90 6 120h112c14-30 16-80 6-120z" fill="${o.hair}"/>`:''}
<path d="M24 210c0-45 30-62 76-62s76 17 76 62z" fill="#f2f2f8"/>
<path d="M78 148l22 22 22-22" fill="#fff" stroke="#c9cbe0" stroke-width="3"/>
<rect x="86" y="118" width="28" height="36" fill="${o.skin}"/>
<ellipse cx="100" cy="92" rx="42" ry="48" fill="${o.skin}"/>
<ellipse cx="58" cy="96" rx="7" ry="11" fill="${o.skin}"/><ellipse cx="142" cy="96" rx="7" ry="11" fill="${o.skin}"/>
${o.cap?`<path d="M52 78c0-34 20-48 48-48s48 14 48 48z" fill="#1d2b4f"/><path d="M44 80h112l24 12H44z" fill="#14203f"/>`:`<path d="M55 84c-8-48 22-62 48-60 30 2 48 22 40 60-6-18-14-28-44-30-24-2-34 12-44 30z" fill="${o.hair}"/>
${[...Array(9)].map((_,i)=>{const t=Math.PI*i/8;return `<circle cx="${(100-54*Math.cos(t)).toFixed(1)}" cy="${(70-40*Math.sin(t)-(i%2)*4).toFixed(1)}" r="15" fill="${o.hair}"/>`}).join('')}`}
<path d="M70 82q10-8 22-2M108 80q12-6 22 2" stroke="${o.hair==='#1b130e'?'#120c08':o.hair}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
${o.sun?`<rect x="64" y="86" width="30" height="16" rx="6" fill="#111"/><rect x="106" y="86" width="30" height="16" rx="6" fill="#111"/><path d="M94 92h12" stroke="#111" stroke-width="3"/>`:
`<ellipse cx="80" cy="96" rx="8" ry="9" fill="#fff"/><ellipse cx="120" cy="96" rx="8" ry="9" fill="#fff"/><circle cx="82" cy="98" r="5" fill="#3a2214"/><circle cx="122" cy="98" r="5" fill="#3a2214"/><circle cx="84" cy="95" r="1.8" fill="#fff"/><circle cx="124" cy="95" r="1.8" fill="#fff"/>`}
${o.glasses?`<g fill="rgba(255,255,255,.18)" stroke="#2a2a2a" stroke-width="4"><circle cx="80" cy="97" r="14"/><circle cx="120" cy="97" r="14"/></g><path d="M94 97h12" stroke="#2a2a2a" stroke-width="4"/>`:''}
${o.open?`<path d="M76 120q24 28 48 0z" fill="#7a1f1f"/><path d="M80 120h40q-4 6-20 6t-20-6z" fill="#fff"/>`:`<path d="M82 120q18 12 36-2" stroke="#8a3d22" stroke-width="4" fill="none" stroke-linecap="round"/>`}
${o.beard?`<path d="M92 128q8 6 16 0" stroke="#2a1a10" stroke-width="5" fill="none"/>`:''}
${o.band?`<rect x="72" y="98" width="22" height="9" rx="3" fill="#e9c9a0" transform="rotate(-18 83 102)" opacity=".95"/>`:''}
</svg>`;
}
PF.head=head;
PF.avatarKinds={
  boy:{},
  girl:{long:1,hair:'#26150f',skin:'#e6b08a',bg:['#ff9ad0','#8e5ad8']},
  glasses:{glasses:1,skin:'#d9966a',bg:['#7fd2ff','#3a7ad0']},
  sun:{long:1,sun:1,hair:'#3a2018',skin:'#eab08c',bg:['#ffc0e0','#7f6ad8']},
  cap:{cap:1,beard:1,skin:'#d79a6e',bg:['#8a8cff','#4a4ad0']},
  rafid:{glasses:1,beard:1,open:1,skin:'#d7996c',bg:['#ff9aa8','#c23a58']},
  boyT:{bg:0},glassesT:{bg:0,glasses:1,skin:'#d9966a',open:0,smile:1},laugh:{bg:0,open:1},
  mystery:{skin:'#14081c',hair:'#14081c',smile:0,bg:['#4a2a6a','#1a0a30']},
};

function hero(pose){
  return `<svg viewBox="0 0 400 640">
<defs><linearGradient id="sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfbff"/><stop offset="1" stop-color="#cfd2e6"/></linearGradient></defs>
<path d="M92 250c-60 40-80 140-70 300l60 10 20-200z" fill="#1d2130"/>
<path d="M330 250c50 40 70 140 60 300l-60 10-20-200z" fill="#1d2130"/>
<path d="M70 640V330c0-50 40-76 130-76s130 26 130 76v310z" fill="url(#sh)"/>
<path d="M158 262l42 46 42-46" fill="#fff" stroke="#b7bbd4" stroke-width="5"/>
<path d="M150 252c10 36 90 36 100 0" fill="none" stroke="#2a2f46" stroke-width="16" stroke-linecap="round"/>
<circle cx="146" cy="262" r="26" fill="#151a2c" stroke="#35d1e8" stroke-width="5"/><circle cx="254" cy="262" r="26" fill="#151a2c" stroke="#35d1e8" stroke-width="5"/>
<path d="M265 330l34 4-4 44q-18 20-34-2z" fill="#2c4a9a" stroke="#e6b83a" stroke-width="4"/><text x="283" y="366" font-size="14" fill="#f4d35a" text-anchor="middle" font-weight="800" font-family="Poppins">KYAU</text>
<rect x="176" y="204" width="48" height="60" fill="#dfa070"/>
<ellipse cx="200" cy="150" rx="66" ry="78" fill="#e3a674"/>
<ellipse cx="136" cy="156" rx="11" ry="18" fill="#dfa070"/><ellipse cx="264" cy="156" rx="11" ry="18" fill="#dfa070"/>
<path d="M130 138c-18-74 40-104 76-98 50 6 74 44 62 98-10-30-24-50-70-52-40-2-52 22-68 52z" fill="#1b130e"/>
${[0,1,2,3,4,5,6,7,8].map(i=>{const t=Math.PI*i/8;return `<circle cx="${(200-76*Math.cos(t)).toFixed(1)}" cy="${(112-62*Math.sin(t)-(i%2)*6).toFixed(1)}" r="24" fill="#1b130e"/>`}).join('')}
<path d="M150 134q14-12 36-4M214 130q22-8 38 4" stroke="#120c08" stroke-width="9" fill="none" stroke-linecap="round"/>
<ellipse cx="166" cy="156" rx="12" ry="12.5" fill="#fff"/><ellipse cx="236" cy="156" rx="12" ry="12.5" fill="#fff"/>
<circle cx="168" cy="158" r="7.5" fill="#3a2214"/><circle cx="238" cy="158" r="7.5" fill="#3a2214"/><circle cx="171" cy="154" r="2.6" fill="#fff"/><circle cx="241" cy="154" r="2.6" fill="#fff"/>
<path d="M166 200q34 26 70 -8" stroke="#8a3d22" stroke-width="6" fill="none" stroke-linecap="round"/>
<rect x="238" y="170" width="30" height="13" rx="4" fill="#ecd1a8" transform="rotate(-20 253 176)"/>
<path d="M60 360c20-20 170-8 280 6l-8 52c-110 14-230 26-290-2z" fill="#e3a674"/>
<path d="M340 360c-40-30-160 0-210 14l8 52c60 6 160-16 202-30z" fill="#d89a68"/>
<path d="M104 370c60-14 150 0 204 14" stroke="#9a6740" stroke-width="3" fill="none"/>
<rect x="190" y="384" width="46" height="34" rx="8" fill="#20263e"/><circle cx="213" cy="401" r="12" fill="#cfd7ea"/>
<path d="M70 640V470c70 20 190 20 260 0v170z" fill="#101528"/>
</svg>`;
}
PF.hero=hero;

/* ---------------- pens ---------------- */
const PC={
 blue:['#5f86ff','#1f3fc4','#0e1f78'],red:['#ff6a6a','#d51f2e','#7e0a14'],black:['#555','#1b1b1f','#000'],
 green:['#5ce063','#169b2c','#08541a'],gold:['#ffe08a','#d9a321','#7a5200'],neon:['#e08aff','#7a2fd8','#2d1070'],
 silver:['#f4f7fb','#aab3c4','#5e6779'],fire:['#ffd23c','#e8321e','#7a0f0a'],cyber:['#7ae9ff','#6a3df0','#20106e'],galaxy:['#b88aff','#4a2fc8','#150b60'],
 shadow:['#6df06d','#157a28','#06330f'],blaze:['#ffc23c','#e53410','#730a00'],purple:['#d28aff','#8a2fd8','#3d0b78']};
function pen(c,label,w){
  const p=PC[c]||PC.blue, id='p'+Math.random().toString(36).slice(2,7);
  return `<svg viewBox="0 0 520 70" style="width:100%;height:auto;overflow:visible">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset=".35" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient>
<linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#b8c0d2"/><stop offset="1" stop-color="#5d6579"/></linearGradient>
<pattern id="${id}d" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0h9M0 0v9" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/></pattern></defs>
<path d="M0 35l46-9v18z" fill="url(#${id}m)"/><path d="M0 35l46-1v1z" stroke="#333" stroke-width="1"/>
<path d="M46 26h30l6 4v10l-6 4H46z" fill="url(#${id}m)"/>
<path d="M82 22h120v26H82z" fill="url(#${id})"/><path d="M82 22h120v26H82z" fill="url(#${id}d)"/>
<path d="M202 16h250l16 4v30l-16 4H202z" fill="url(#${id})"/>
<rect x="202" y="21" width="260" height="5" fill="rgba(255,255,255,.55)" rx="2.5"/>
<rect x="196" y="14" width="10" height="42" rx="3" fill="url(#${id}m)"/>
<rect x="300" y="10" width="190" height="9" rx="4" fill="url(#${id}m)"/><rect x="300" y="10" width="12" height="22" rx="4" fill="url(#${id}m)"/>
<path d="M468 20l28 6v18l-28 6z" fill="url(#${id}m)"/><rect x="496" y="28" width="16" height="14" rx="4" fill="url(#${id})"/>
${label?`<text x="330" y="44" font-size="18" font-weight="800" fill="#fff" text-anchor="middle" font-family="Poppins" letter-spacing="2" opacity=".95">${label}</text>`:''}
</svg>`;
}
PF.pen=pen;

const crumpleSVG=`<svg viewBox="0 0 150 140"><defs><filter id="sd"><feDropShadow dx="0" dy="6" stdDeviation="4" flood-opacity=".4"/></filter></defs><g filter="url(#sd)">
<polygon points="10,70 40,18 90,6 135,40 142,95 100,132 40,128" fill="#e9e4f4"/>
<polygon points="40,18 90,6 70,60" fill="#fff"/><polygon points="90,6 135,40 70,60" fill="#cfc6ea"/><polygon points="135,40 142,95 70,60" fill="#f4f0ff"/>
<polygon points="142,95 100,132 70,60" fill="#bdb0e0"/><polygon points="100,132 40,128 70,60" fill="#ddd5f2"/><polygon points="40,128 10,70 70,60" fill="#b5a8dc"/><polygon points="10,70 40,18 70,60" fill="#efeaff"/></g></svg>`;
PF.crumple=crumpleSVG;
PF.crownSVG=`<svg viewBox="0 0 80 60" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 50l-4-34 18 16 18-26 18 26 18-16-4 34z"/><path d="M10 54h60"/></svg>`;

/* ---------------- logo ---------------- */
function logo(){
  const t=(txt,y,fs,g)=>`<text x="130" y="${y}" text-anchor="middle" font-family="Lilita One,Impact,sans-serif" font-size="${fs}" transform="skewX(-9) translate(15 0)" letter-spacing="1" stroke-linejoin="round">
    <tspan fill="#0b1538" stroke="#0b1538" stroke-width="11" dy="5">${txt}</tspan></text>
    <text x="130" y="${y}" text-anchor="middle" font-family="Lilita One,Impact,sans-serif" font-size="${fs}" transform="skewX(-9) translate(15 0)" letter-spacing="1" stroke-linejoin="round" fill="url(#${g})" stroke="#16255a" stroke-width="6" paint-order="stroke">${txt}</text>`;
  return `<svg class="pp" viewBox="0 0 260 187"><defs>
<linearGradient id="lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d94ff"/><stop offset="1" stop-color="#14309a"/></linearGradient>
<linearGradient id="lr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#b3141f"/></linearGradient>
<linearGradient id="lo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe14a"/><stop offset=".55" stop-color="#ffa51a"/><stop offset="1" stop-color="#ff7a00"/></linearGradient>
<linearGradient id="lw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#dfe8ff"/><stop offset="1" stop-color="#8fa8de"/></linearGradient>
<linearGradient id="lribg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe36a"/><stop offset="1" stop-color="#f0a800"/></linearGradient></defs>
<g transform="translate(130 80) rotate(36)"><rect x="-120" y="-10" width="236" height="20" rx="10" fill="url(#lb)" stroke="#0b1538" stroke-width="3"/><path d="M-120 0l-14 0" stroke="#ccd" stroke-width="3"/><rect x="60" y="-6" width="40" height="4" fill="#fff" opacity=".5"/></g>
<g transform="translate(130 80) rotate(-36)"><rect x="-116" y="-10" width="236" height="20" rx="10" fill="url(#lr)" stroke="#0b1538" stroke-width="3"/><rect x="-100" y="-6" width="40" height="4" fill="#fff" opacity=".5"/></g>
<g transform="translate(94 -2) scale(.95)" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 46l-4-30 18 14 18-24 18 24 18-14-4 30z"/></g>
${t('PEN',92,84,'lo')}${t('FiGHT',150,84,'lw')}
<g transform="rotate(-3 150 168)"><path d="M62 154l178 -4 2 28-178 4z" fill="url(#lribg)" stroke="#caa" stroke-width=".5"/><text x="152" y="174" text-anchor="middle" font-family="Poppins,sans-serif" font-weight="800" font-size="16" fill="#1b1b1b">KYAU UNIVERSITY</text></g>
</svg>`;
}
PF.logo=logo;

/* ---------------- renderer ---------------- */
const EMO={};
PF.render=function(root){
  root=root||document;
  root.querySelectorAll('[data-props]').forEach(e=>{const v=e.dataset.props;const p=e.parentNode;
   e.insertAdjacentHTML('beforebegin',`<div data-books style="left:-20px;top:${v==='high'?640:700}px;transform-origin:left top"></div><div data-pen="blue" data-label="KYAU" style="left:250px;top:830px;width:280px;transform:rotate(-13deg)"></div><div data-pen="red" style="left:1130px;top:835px;width:310px;transform:rotate(13deg)"></div><div data-crumple style="left:1490px;top:750px;width:170px;height:150px"></div><div class="a hand" style="left:1290px;top:845px;font-size:46px;transform:rotate(-8deg)">Pen Fight</div>`);e.remove();});
  root.querySelectorAll('[data-i]:not([data-d])').forEach(e=>{e.dataset.d=1;e.innerHTML=PF.icon(e.dataset.i,e.dataset.c);e.style.display=e.style.display||'inline-block'});
  root.querySelectorAll('[data-scene]:not([data-d])').forEach(e=>{e.dataset.d=1;e.outerHTML=PF.scene(e.dataset.scene==='day'?'':e.dataset.scene)});
  root.querySelectorAll('[data-logo]:not([data-d])').forEach(e=>{e.dataset.d=1;e.classList.add('logo','a');e.innerHTML=logo()});
  root.querySelectorAll('[data-av]:not([data-d])').forEach(e=>{e.dataset.d=1;e.innerHTML=head(PF.avatarKinds[e.dataset.av]||{})});
  root.querySelectorAll('[data-hero]:not([data-d])').forEach(e=>{e.dataset.d=1;e.innerHTML=hero(e.dataset.hero)});
  root.querySelectorAll('[data-pen]:not([data-d])').forEach(e=>{e.dataset.d=1;e.classList.add('pen');e.innerHTML=pen(e.dataset.pen,e.dataset.label||'')});
  root.querySelectorAll('[data-books]:not([data-d])').forEach(e=>{e.dataset.d=1;e.classList.add('books');e.innerHTML='<b>পদার্থবিজ্ঞান</b><b>গণিত</b><b>রসায়ন</b>'});
  root.querySelectorAll('[data-crumple]:not([data-d])').forEach(e=>{e.dataset.d=1;e.classList.add('crumple');e.innerHTML=crumpleSVG});
  root.querySelectorAll('[data-crown]:not([data-d])').forEach(e=>{e.dataset.d=1;e.classList.add('a');e.innerHTML=PF.crownSVG});
  root.querySelectorAll('[data-cur]:not([data-d])').forEach(e=>{e.dataset.d=1;
    e.innerHTML=`<div class="cur" style="left:${e.dataset.x||1150}px;top:${e.dataset.y||20}px"><i>${PF.icon('coin')}</i><span>45,600</span><b class="plus">${PF.icon('plus')}</b></div>
    <div class="cur gem" style="left:${(+e.dataset.x||1150)+(+e.dataset.gap||218)}px;top:${e.dataset.y||20}px"><i>${PF.icon('gem')}</i><span>780</span><b class="plus">${PF.icon('plus')}</b></div>
    ${e.hasAttribute('data-nohome')?'':`<div class="cbtn" data-go="s04" style="left:${(+e.dataset.x||1150)+(+e.dataset.gap||218)+196}px;top:${(+e.dataset.y||20)-12}px;width:84px;height:84px;color:#fff">${PF.icon('home')}</div>`}`;
    e.classList.add('a');e.style.cssText+=';left:0;top:0;width:0;height:0'});
  /* standard top bar */
  root.querySelectorAll('[data-top]:not([data-d])').forEach(e=>{e.dataset.d=1;const d=e.dataset;
    const bx=+d.bx||540,bw=+d.bw||570;
    e.classList.add('a');e.style.cssText+=';left:0;top:0;width:0;height:0';
    e.innerHTML=`${d.back===''?'':`<div class="cbtn" data-go="${d.back||'back'}" style="left:24px;top:22px;width:76px;height:76px;color:#fff">${PF.icon('back')}</div>`}
      <div data-logo style="--w:190px;left:132px;top:8px"></div>
      <div class="banner" style="left:${bx}px;top:26px;width:${bw}px;height:80px"><div class="in ${d.white?'w':''}">${d.icon?`<i style="width:48px;height:48px;color:${d.ic||'#ffc61a'}" data-i="${d.icon}"></i>`:''}<span>${d.title}</span></div></div>
      ${d.sub?`<div class="sub" style="left:${bx-120}px;width:${bw+240}px;top:118px">${d.sub}</div>`:''}
      <div data-cur ${d.nohome!==undefined?'data-nohome':''}></div>`;
    PF.render(e)});
};

/* ---------------- screen list / nav ---------------- */
PF.screens=[];
PF.go=function(id){location.href=id+'.html'};
PF.toast=function(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.querySelector('.stage').appendChild(t);setTimeout(()=>t.remove(),1800)};
function fit(){
  const st=document.querySelector('.stage');if(!st)return;
  const w=+st.dataset.w,h=+st.dataset.h;st.style.width=w+'px';st.style.height=h+'px';
  const s=Math.min(innerWidth/w,innerHeight/h);
  st.style.transform=`translate(-50%,-50%) scale(${s})`;
}
document.addEventListener('DOMContentLoaded',()=>{
  PF.render();fit();
  document.addEventListener('click',ev=>{
    const g=ev.target.closest('[data-go]');
    if(g){const t=g.dataset.go;if(t==='back')history.length>1?history.back():PF.go('index');else if(t==='index')location.href='../index.html';else PF.go(t)}
    const m=ev.target.closest('[data-toast]');if(m)PF.toast(m.dataset.toast);
    const s=ev.target.closest('[data-pick]');
    if(s){const grp=s.dataset.pick;document.querySelectorAll(`[data-pick="${grp}"]`).forEach(x=>x.classList.remove('on'));s.classList.add('on')}
  });
  const m=location.pathname.match(/(s|a)(\d+)\.html$/);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')location.href='../index.html';
    if(m&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){let n=+m[2]+(e.key==='ArrowRight'?1:-1);if(n<1)return;location.href=m[1]+String(n).padStart(2,'0')+'.html'}
  });
});
addEventListener('resize',fit);
})();
