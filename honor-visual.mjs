export function honorBanner(m){
 const star=m.type==='growth_star';
 return `<div class="honor-banner ${star?'star-banner':'maker-banner'}" role="img" aria-label="${star?'成长之星人物与作品Banner卡片':'共创达人创作主题Banner卡片'}">
 ${star?`<img class="star-photo" src="./assets/growth-star-photo.jpg" alt="成长之星与他的拼搭作品"><div class="star-shade"></div>`:`<svg class="maker-art" viewBox="0 0 300 230" aria-hidden="true"><g fill="none" stroke-linejoin="round" stroke-width="9"><path stroke="#7bc8ff" d="M60 125 145 30 247 92 167 191Z M60 125 150 111 145 30 M150 111 247 92 M150 111 167 191"/><path stroke="#ffce63" d="M98 194 202 42 265 170Z M98 194 177 139 202 42 M177 139 265 170"/></g><g fill="#fff3d9" stroke="#dfb96c" stroke-width="2">${[[60,125],[145,30],[247,92],[167,191],[150,111],[98,194],[202,42],[265,170],[177,139]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g></svg>`}
 <div class="banner-copy"><span class="banner-kicker">${star?'2026 · 09  /  本月成长之星':'ZOMETOOL  /  创作者荣誉'}</span><strong>${star?'每一份热爱<br>都值得被看见':'共创达人<br>让创意被看见'}</strong><span class="banner-caption">${star?'星云的拼搭故事':'你的分享，点亮更多拼搭灵感'}</span></div>
 ${star?'<img class="star-seal" src="./assets/growth-star-badge.png" alt="成长之星身份标识">':'<span class="maker-seal">共创达人</span>'}</div>`;
}
