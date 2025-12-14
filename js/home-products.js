const PRODUCTS = [
  {name:'Jetson Orin Nano',img:'/assets/products/jetson.webp'},
  {name:'Raspberry Pi 5',img:'/assets/products/rpi5.webp'},
  {name:'ESP32 Pro',img:'/assets/products/esp32.webp'},
  {name:'Lidar 360',img:'/assets/products/lidar.webp'},
  {name:'Robotic Arm X',img:'/assets/products/arm.webp'},
  {name:'AI Camera Luxonis',img:'/assets/products/cam.webp'},
  {name:'FPGA Dev Kit',img:'/assets/products/fpga.webp'},
  {name:'Jetson Xavier',img:'/assets/products/xavier.webp'},
  {name:'Industrial Sensor',img:'/assets/products/sensor.webp'},
  {name:'Edge Gateway',img:'/assets/products/gateway.webp'},
  {name:'Coral TPU',img:'/assets/products/coral.webp'},
  {name:'3D Vision Module',img:'/assets/products/vision.webp'}
];

let idx = 0;
function render(){
  const wrap = document.getElementById('home-products');
  wrap.innerHTML='';
  PRODUCTS.slice(idx, idx+10).forEach(p=>{
    const d=document.createElement('div');
    d.className='product-card';
    d.innerHTML=<img src="\"><span>\</span>;
    wrap.appendChild(d);
  });
  idx = (idx+1) % (PRODUCTS.length-9);
}
setInterval(render,4000);
document.addEventListener('DOMContentLoaded',render);
