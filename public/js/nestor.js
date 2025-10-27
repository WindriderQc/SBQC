let speechRec = null
let mouth = null
let isSpeaking = false

// Helper function to update dashboard status
function updateStatus(elementId, text, color = null) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
        if (color) {
            el.className = `badge bg-${color}`;
        }
    }
}

function gotSpeech() 
{
    if (isSpeaking) { 
        return; // Prevent recording while speaking
    }
    
    if(speechRec.resultValue && speechRec.resultString){
    
        const confidence = Math.round(speechRec.resultConfidence * 100);
        console.log('👂 Heard:', speechRec.resultString, `(${confidence}% confidence)`)
        
        // Create paragraph element with timestamp and confidence
        const p = document.createElement('p');
        p.className = 'small mb-1';
        const time = new Date().toLocaleTimeString();
        p.innerHTML = `<span class="text-muted">[${time}]</span> <strong>${speechRec.resultString}</strong> <span class="badge bg-info">${confidence}%</span>`;
        
        const speechDiv = document.getElementById('speech');
        if (speechDiv) {
            // Remove placeholder text
            const placeholder = speechDiv.querySelector('em');
            if (placeholder) placeholder.parentElement.remove();
            
            speechDiv.insertBefore(p, speechDiv.firstChild);
            
            // Keep only last 10 commands
            while (speechDiv.children.length > 10) {
                speechDiv.removeChild(speechDiv.lastChild);
            }
        }

        const text = speechRec.resultString.toLowerCase();



        ///  ACTIONS  ///

        if (text.includes('hello')) {
            speak('Yo! How are you?');
            return;
        }

        if (text.includes('dashboard')) {
            speak('Lets go to the dashboard!', ()=>{ window.location.href = "/dashboard" });
            return;
        }



        if (text.includes('back')) {
            speak('Going back!', ()=>{ window.history.back(); });
            return;
        }  
    }     
}

function setMouth(voice=1, rate=1, pitch=1, volume=0.5) 
{
    mouth.setVoice(voice)
    mouth.setRate(rate)
    mouth.setPitch(pitch)
    mouth.setVolume(volume)
}


function speak(text, callback=null) 
{
    isSpeaking = true;

    mouth.speak(text);
    mouth.onEnd = () => {
        setTimeout(() => {
            isSpeaking = false;
            if(callback) callback();
        }, 500); // Adjust the timeout duration as needed
    };
}

 
function voiceReady() 
{
    console.log('🎤 Speech recognition ready')
    updateStatus('nestor-status', 'Ready', 'success');

    setMouth()
    speak('How you doinnn?'); 

    // mouth.setVoice(6)
    // mouth.speak('Caâlisss de tabârnack... Quessé tu fais la encore?'); 
}




function setupNestor() {
    //let lang = navigator.language || 'fr-FR'   //  'en-US'
    let lang = 'en-US'
    console.log('language: ' + lang)
    console.log('🤖 Initializing Nestor voice assistant...')
    
    updateStatus('nestor-status', 'Initializing...', 'warning');
    
    // Initialize speech recognition
    speechRec = new p5.SpeechRec(lang)
    
    // Set the callback BEFORE starting
    speechRec.onResult = gotSpeech
    speechRec.onStart = function() {
        console.log('Speech recognition actually started listening')
        updateStatus('nestor-status', 'Listening', 'success');
        updateStatus('nestor-listening', '🎤 Active');
        
        // Try to get media devices info
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    const audioInputs = devices.filter(device => device.kind === 'audioinput')
                    console.log('Available microphones:', audioInputs)
                    console.log('Number of microphones found:', audioInputs.length)
                    updateStatus('nestor-mics', `${audioInputs.length} detected`);
                })
                .catch(err => {
                    console.error('Error getting devices:', err)
                    updateStatus('nestor-mics', 'Error detecting');
                })
        }
    }
    speechRec.onError = function(err) {
        if (err.error === 'not-allowed') {
            console.error('⚠️ Microphone access denied! This site needs HTTPS or localhost to use speech recognition.')
            console.error('💡 Try accessing via https:// or localhost instead of IP address')
            updateStatus('nestor-status', 'Access Denied', 'danger');
            updateStatus('nestor-listening', '⚠️ Microphone blocked');
        } else if (err.error !== 'no-speech') {
            console.error('Speech error:', err.error)
            updateStatus('nestor-status', 'Error', 'danger');
        }
    }
    speechRec.onEnd = function() {
        // Restart speech recognition after it ends
        if (!isSpeaking) {
            setTimeout(() => {
                speechRec.start(true, false)
            }, 100)
        }
    }
    
    // Start with a slight delay to ensure everything is initialized
    setTimeout(() => {
        speechRec.start(true, false)
    }, 100)

    mouth = new p5.Speech();
    mouth.onLoad = voiceReady;
}