function handleSubmit(event) {
    event.preventDefault()

    // check what text was put into the form field
    let formText = document.getElementById('name').value
    checkForName(formText)

    console.log("::: Form Submitted :::")
    fetch('http://localhost:8080/test')
        .then(res => res.json())
        .then(data => {
            document.getElementById('results').innerHTML = data.message
        })
}

export { handleSubmit }
