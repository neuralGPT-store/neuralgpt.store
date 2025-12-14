const sections = document.querySelectorAll('section');
const links = document.querySelectorAll('nav a');

function show(id){
  sections.forEach(s=>s.classList.remove('active'));
  const el = document.querySelector(id);
  if(el) el.classList.add('active');
}

links.forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    show(a.getAttribute('href'));
  });
});

show('#home');
