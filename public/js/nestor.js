let speechRec = null
let mouth = null
let isSpeaking = false


function gotSpeech() 
{
    if (isSpeaking) return; // Prevent recording while speaking

    //console.log('gotSpeech: ', speechRec)
    if(speechRec.resultValue){
    
        let p = createP(speechRec.resultString);
        let d = document.getElementById('speech')
        //d.innerHTML = p
        p.parent(d)
        //console.log("SpeechRec: ",  p)
        //p.parent(document.getElementById('speech'))
        //createP(speechRec.resultString);

        if (speechRec.resultString.includes('hello')) {
            speak('Yo! How are you?');
        }

        if (speechRec.resultString.includes('dashboard')) {
            speak('Lets go to the dashboard!', ()=>{ window.location.href = "/dashboard" });

        }

    }
    else {
    //let p = createP(speechRec)
    //p.parent(document.getElementById('speech'))
    console.log("SpeechRec No ResultValue: ",  speechRec)
    }
}

function setMouth(voice=1, rate=1, pitch=1, volume=1) 
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
        }, 1500); // Adjust the timeout duration as needed
    };
}

 
function voiceReady() 
{
   console.log('Speech recognition supported 😊')
   console.log('Voices: ', mouth.voices) 

   setMouth()
   speak('How you doinnn?'); 

  // mouth.setVoice(6)
// mouth.speak('Caâlisss de tabârnack... Quessé tu fais la encore?'); 
}




function setupNestor() {
    //let lang = navigator.language || 'fr-FR'   //  'en-US'
    let lang = 'en-US'
    console.log('language: ' + lang)
    speechRec = new p5.SpeechRec(lang, gotSpeech)
    let continuous = true
    speechRec.onResult = gotSpeech
    speechRec.start(continuous, false)


    mouth = new p5.Speech(); // speech synthesis object   
    mouth.onLoad = voiceReady;
}