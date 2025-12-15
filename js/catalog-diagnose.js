(()=>{
  const c=window.CATALOG||{};
  const p=(c.products||[]).length;
  const v=(c.providers||[]).length;
  const s=(c.sponsors||[]).length;
  console.table({products:p, providers:v, sponsors:s});
})();
