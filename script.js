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

const firebaseConfig = {
  apiKey: "AIzaSyA42gBpEuAgUj-_vKDa-vKdKy8gTeJq7uI",
  authDomain: "memorymap-56cd0.firebaseapp.com",
  projectId: "memorymap-56cd0",
  storageBucket: "memorymap-56cd0.firebasestorage.app",
  messagingSenderId: "481702578844",
  appId: "1:481702578844:web:ebc87117795074ae523b59"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let isLoggedIn = false;

firebase.auth().onAuthStateChanged(user => {
  console.log("Auth state changed:", user);
  isLoggedIn = !!user;

  const addBtn = document.getElementById("addMemoryBtn");
  const form = document.getElementById("memoryForm");

  if (isLoggedIn) {
    addBtn.style.display = "inline-block";
  } else {
    addBtn.style.display = "none";
    if (form) form.style.display = "none"; // hide form if logged out
  }

  // only load memories after auth state is known
  loadMemories();
});

const auth = firebase.auth();

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
  } catch (error) {
    console.log("Login failed");
  }
});


document.getElementById('addMemoryBtn').addEventListener('click', () => {
  const form = document.getElementById('memoryForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  firebase.auth().signOut().then(() => {
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    console.log("Logged out");
  });
});

async function getLatLng(location) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
  const data = await response.json();
  if(data && data.length > 0){
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

document.getElementById('submitMemory').addEventListener('click', async () => {
  const title = document.getElementById('memoryTitle').value;
  const location = document.getElementById('memoryLocation').value;
  const url = document.getElementById('memoryURL').value;
  const type = document.getElementById('memoryType').value;

  if(!title || !location || !url) return alert('Fill all fields');

  const coords = await getLatLng(location);
  if(!coords) return alert('Location not found');

  // save to firestore
  const docRef = await db.collection("memories").add({
    title,
    lat: coords.lat,
    lng: coords.lng,
    type,
    url,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  addMemoryMarker({
    title,
    lat: coords.lat,
    lng: coords.lng,
    type,
    url
  }, docRef.id);

  // add to map immediately
  let content = `<h3>${title}</h3>`;
  if(type === 'photo') content += `<img src="${url}" width="200">`;
  else content += `<video width="200" controls><source src="${url}" type="video/mp4"></video>`;

  L.marker([coords.lat, coords.lng]).addTo(map).bindPopup(content, {
    offset: [150, 0],
    autoPan: true,
    className: 'custom-popup'
  }).openPopup();

  document.getElementById('memoryForm').reset();
});

function loadMemories() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  db.collection("memories").orderBy("timestamp").get().then(snapshot => {
    snapshot.forEach(doc => {
      addMemoryMarker(doc.data(), doc.id);
    });
  });
};

function addMemoryMarker(mem, docId) {
  let content = `<h3>${mem.title}</h3>`;

  if (mem.type === "photo") {
    content += `<img src="${mem.url}" width="200">`;
  } else {
    content += `
      <video width="200" controls>
        <source src="${mem.url}" type="video/mp4">
      </video>`;
  }

  if (isLoggedIn) {
    content += `
      <br>
      <button class="delete-btn" onclick="deleteMemory('${docId}', this)">
        🗑 Delete
      </button>
    `;
  }

  const marker = L.marker([mem.lat, mem.lng]).addTo(map);
  marker.bindPopup(content, {
    offset: [150, 0],
    autoPan: true,
    className: 'custom-popup'
  });

  return marker;
}

async function deleteMemory(docId, btn) {
  const confirmed = confirm("Are you sure you want to delete this memory?");
  if (!confirmed) return;

  try {
    await db.collection("memories").doc(docId).delete();

    // Close popup and remove marker
    const popup = btn.closest('.leaflet-popup');
    const marker = popup._leaflet_pos
      ? map._layers[popup._leaflet_id]
      : null;

    map.closePopup();
    location.reload(); // simplest + safest
  } catch (err) {
    alert("Failed to delete memory");
    console.error(err);
  }
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("addMemoryBtn").style.display = "block";
  } else {
    document.getElementById("addMemoryBtn").style.display = "none";
  }
});


