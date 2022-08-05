function getData(){
    
    let name = document.getElementById('name').value
    let email = document.getElementById('email').value
    let number = document.getElementById('number').value
    let subject = document.getElementById('subject').value
    let message = document.getElementById('message').value

    if(!name || !email || !number || !subject || !message){
        return alert('The documents cannot be empty!!!')
    }

    let toEmail = 'bangHaji@gmail.com'

    let a = document.createElement('a')

    a.href = `mailto:${toEmail}?subject=${subject}&body=Hi my name is ${name}, ${message}, this is my phone number ${number}, please contact me.`
    a.click()
}