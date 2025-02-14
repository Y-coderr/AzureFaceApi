const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const createFaceClient = require('@azure-rest/ai-vision-face').default;
const { AzureKeyCredential } = require('@azure/core-auth');

// Person group configuration
const PERSON_GROUP_ID = 'auth-group';
const RECOGNITION_MODEL = 'recognition_04';




const endpoint = process.env.AZURE_FACE_ENDPOINT || "https://ideathon-faceapi.cognitiveservices.azure.com/";
const apiKey = process.env.AZURE_FACE_KEY || "3EaRh7iDUk1sysvtLNJjY3wEfOwNFvytneKVoszsVjfFaineiyS3JQQJ99BBAC3pKaRXJ3w3AAAKACOG0H8s";
const client = createFaceClient(endpoint, new AzureKeyCredential(apiKey));

// Create person group if it doesn't exist
async function initializePersonGroup() {
  try {
    await client.path('/largepersongroups/{largePersonGroupId}', PERSON_GROUP_ID).put({
      body: {
        name: PERSON_GROUP_ID,
        recognitionModel: RECOGNITION_MODEL,
      },
    });
    console.log(`Person group ${PERSON_GROUP_ID} created successfully`);
  } catch (error) {
    console.error('Error creating person group:', error);
  }
}

// Initialize person group on startup
initializePersonGroup();


// Add a new person to the person group
router.post('/addPerson', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const response = await client
      .path('/largepersongroups/{largePersonGroupId}/persons', PERSON_GROUP_ID)
      .post({ body: { name } });

    res.json({ 
      message: 'Person added successfully',
      personId: response.body.personId 
    });
  } catch (error) {
    console.error('Error adding person:', error);
    res.status(500).json({ message: 'Error adding person' });
  }
});

// Add face images for training
router.post('/addFace', async (req, res) => {
  try {
    const { personId, imageUrl } = req.body;
    if (!personId || !imageUrl) {
      return res.status(400).json({ message: 'personId and imageUrl are required' });
    }

    const response = await client
      .path('/largepersongroups/{largePersonGroupId}/persons/{personId}/persistedfaces', 
        PERSON_GROUP_ID, personId)
      .post({ 
        queryParameters: { detectionModel: 'detection_03' },
        body: { url: imageUrl }
      });

    res.json({ 
      message: 'Face added successfully',
      persistedFaceId: response.body.persistedFaceId
    });
  } catch (error) {
    console.error('Error adding face:', error);
    res.status(500).json({ message: 'Error adding face' });
  }
});

// Train the person group
router.post('/train', async (req, res) => {
  try {
    const response = await client
      .path('/largepersongroups/{largePersonGroupId}/train', PERSON_GROUP_ID)
      .post();

    res.json({ message: 'Training started successfully' });
  } catch (error) {
    console.error('Error starting training:', error);
    res.status(500).json({ message: 'Error starting training' });
  }
});

router.post('/verify', async (req, res) => {

    try {
        const { image } = req.body;
        
        // Detect face in the captured image
        const detectResponse = await client.path('/detect').post({
            contentType: 'application/json',
            queryParameters: {
                detectionModel: 'detection_03',
                recognitionModel: 'recognition_04',
                returnFaceId: true
            },
            body: { url: image }
        });

        if (!detectResponse.body || detectResponse.body.length === 0) {
            return res.status(400).json({ message: 'No face detected in the image' });
        }

        const faceId = detectResponse.body[0].faceId;

        // Verify face against the trained person group
        const verifyResponse = await client.path('/verify').post({
            body: {
                faceId: faceId,
                largePersonGroupId: process.env.PERSON_GROUP_ID || 'default-group'
            }
        });

        if (verifyResponse.body.isIdentical) {
            return res.json({ 
                message: `Authentication successful! Confidence: ${verifyResponse.body.confidence}`
            });
        } else {
            return res.json({ 
                message: 'Authentication failed. Face does not match.'
            });
        }
    } catch (error) {
        console.error('Error in verification:', error);
        res.status(500).json({ message: 'Error processing verification request' });
    }
});

module.exports = router;
