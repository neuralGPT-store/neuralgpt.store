// memory-engine.js
(function(){
  window.LocalAI = window.LocalAI || {};
  var KEY = 'localai_memory_v1';
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}') }catch(e){return{}} }
  function write(obj){ try{ localStorage.setItem(KEY, JSON.stringify(obj||{})) }catch(e){} }
  function update(fields){ var m = read(); Object.keys(fields||{}).forEach(function(k){ m[k]=fields[k] }); m.updatedAt = new Date().toISOString(); write(m); return m }
  function clear(){ localStorage.removeItem(KEY) }
  function get(){ return read() }
  window.LocalAI.memoryEngine = { get:get, update:update, clear:clear };
})();
