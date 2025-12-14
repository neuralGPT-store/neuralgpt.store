(() => {
  const killers = ['header','main','section','div'];
  document.querySelectorAll(killers.join(',')).forEach(el=>{
    const cs = getComputedStyle(el);
    if (
      (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') ||
      (cs.backgroundImage && cs.backgroundImage !== 'none')
    ){
      el.style.background = 'transparent';
      el.style.backgroundColor = 'transparent';
      el.style.backgroundImage = 'none';
    }
    if (el.classList.contains('section')){
      el.style.minHeight = '100vh';
    }
  });
})();
