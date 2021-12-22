console.log("Welcome to Rock Paper Scissors game")

const userScore_span = document.getElementById("user-score")
const computerScore_span = document.getElementById("computer-score")
const scoreBoard_div = document.querySelector(".score-board")
const result_p = document.querySelector(".result > p")
const rock_div = document.getElementById("r")
const paper_div = document.getElementById("p")
const scissors_div = document.getElementById("s")

let userScore = 0
let computerScore = 0


function getComputerChoice() {
    const choices = ['r', 'p', 's']
    const randomNum =  Math.floor(Math.random() *3)
    return choices[randomNum]
}

function convertToWord(choice) {
    if(choice === 'r') return 'Rock'
    if(choice === 'p') return 'Paper'
    return 'Scissors'
}

function win(userchoice, computerchoice) {
    const smallUserWord = " user".fontsize(3).sup()  //  sub()
    const smallCompWord = " comp".fontsize(3).sup()
    const playerMove = document.getElementById(userchoice)

    userScore++
    userScore_span.innerHTML = userScore
    result_p.innerHTML = `${convertToWord(userchoice)}${smallUserWord} beats ${convertToWord(computerchoice)}${smallCompWord},  You win!!  🔥`
    playerMove.classList.add('green-glow')
    setTimeout(()=> playerMove.classList.remove('green-glow'), 400)
}

function lose(userchoice, computerchoice) {
    const smallUserWord = " user".fontsize(3).sub()  
    const smallCompWord = " comp".fontsize(3).sub()
    const playerMove = document.getElementById(userchoice)

    computerScore++
    computerScore_span.innerHTML = computerScore
    result_p.innerHTML =  `${convertToWord(computerchoice)}${smallCompWord} beats ${convertToWord(userchoice)}${smallUserWord},   You lose!!  😢💩`  
    playerMove.classList.add('red-glow')
    setTimeout(()=> playerMove.classList.remove('red-glow'), 400)
}

function nobodywins(userchoice, computerchoice) {   
    const playerMove = document.getElementById(userchoice)
    
    result_p.innerHTML =  `${convertToWord(computerchoice)} equals ${convertToWord(userchoice)},  It's a Draw...  ⚖️`
    playerMove.classList.add('gray-glow')
    setTimeout(()=> playerMove.classList.remove('gray-glow'), 400)
}

function game(userChoice)  {
    const computerChoice = getComputerChoice()
    //console.log("user choice => " + userChoice)
    //console.log("computer choice => " + computerChoice)

    switch(userChoice + computerChoice) {
        case "pr":
        case "sp":
        case "rs":    
            console.log("USER WINS")
            win(userChoice, computerChoice)
            break
        case "rp":
        case "ps":
        case "sr":
            console.log("USER LOSES")
            lose(userChoice, computerChoice)
            break 
        case "rr":
        case "pp":
        case "ss":
            console.log("IT'S A DRAW")
            nobodywins(userChoice, computerChoice)
            break    
    }
}

rock_div.addEventListener('click', () => game('r') )
paper_div.addEventListener('click', () => game('p') )
scissors_div.addEventListener('click', () => game('s') )