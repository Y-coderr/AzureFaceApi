const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture');
const verifyBtn = document.getElementById('verify');
const resultDiv = document.getElementById('result');

let capturedImage = null;

// Access webcam
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        resultDiv.textContent = 'Error accessing camera: ' + err.message;
    }
}

// Capture image from video stream
captureBtn.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedImage = canvas.toDataURL('image/jpeg');
    resultDiv.textContent = 'Image captured successfully!';
});

// Send image for verification
verifyBtn.addEventListener('click', async () => {
    if (!capturedImage) {
        resultDiv.textContent = 'Please capture an image first';
        return;
    }

    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: capturedImage })
        });

        const data = await response.json();
        resultDiv.textContent = data.message;
    } catch (err) {
        resultDiv.textContent = 'Error verifying face: ' + err.message;
    }
});

// Training functionality
document.getElementById('addPerson').addEventListener('click', async () => {
    const name = document.getElementById('personName').value;
    if (!name) {
        resultDiv.textContent = 'Please enter your name';
        return;
    }

    try {
        const response = await fetch('/api/addPerson', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        const data = await response.json();
        resultDiv.textContent = data.message;
        if (data.personId) {
            localStorage.setItem('personId', data.personId);
        }
    } catch (err) {
        resultDiv.textContent = 'Error adding person: ' + err.message;
    }
});

document.getElementById('addFace').addEventListener('click', async () => {
    const personId = localStorage.getItem('personId');
    const imageUrl = document.getElementById('imageUrl').value;
    
    console.log('Retrieved personId from localStorage:', personId);
    console.log('Image URL:', imageUrl);
    
    if (!personId || !imageUrl) {
        resultDiv.textContent = 'Please add a person first and provide an image URL';
        console.error('Missing personId or imageUrl');
        return;
    }


    try {
        const response = await fetch('/api/addFace', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ personId, imageUrl })
        });

        const data = await response.json();
        resultDiv.textContent = data.message;
    } catch (err) {
        resultDiv.textContent = 'Error adding face: ' + err.message;
    }
});

document.getElementById('train').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/train', {
            method: 'POST'
        });

        const data = await response.json();
        resultDiv.textContent = data.message;
    } catch (err) {
        resultDiv.textContent = 'Error training model: ' + err.message;
    }
});

// Initialize camera on page load
initCamera();
