// initialize the map
const map = L.map('map').setView([20, 0], 2);

// load tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// load memories from JSON
fetch('memories.json')
  .then(response => response.json())
  .then(memories => {
    memories.forEach(memory => {
      const marker = L.marker([memory.lat, memory.lng]).addTo(map);
      let popupContent = `<h3>${memory.title}</h3>`;
      if(memory.type === 'photo'){
        popupContent += `<img src="${memory.url}" style="width:200px;">`;
      } else if(memory.type === 'video'){
        popupContent += `<video controls width="200"><source src="${memory.url}" type="video/mp4"></video>`;
      }
      marker.bindPopup(popupContent, { 
        offset: [150, 200], 
        autoPan: true, 
        className: 'custom-popup'
        });
    });
  });
