const spTrack = document.querySelector('.sp-track');
document.querySelector('.sp-nav.next')?.addEventListener('click',()=>spTrack.scrollBy({left:320,behavior:'smooth'}));
document.querySelector('.sp-nav.prev')?.addEventListener('click',()=>spTrack.scrollBy({left:-320,behavior:'smooth'}));
