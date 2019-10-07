document.addEventListener('DOMContentLoaded', function() {
    var input = document.querySelector('#file');
    var submit = document.querySelector('#submit');
    var label = document.querySelector('#label');
    var list = document.querySelector('#list');
    var spinner = document.querySelector('#spinner');
    var downloadBtn = document.querySelector('#download');
    var alertNode = document.querySelector('#alert');

    input.addEventListener('change', function() {
        var filesSelected = input.files;
        if (filesSelected.length) {
            var fileNames = Array.from(filesSelected).map(item => item.name);
            var liNodes = fileNames
                .map(item => `<li class="list-group-item">${item}</li>`)
                .join('');
            label.textContent = 'Файлы выбраны ↓';
            list.innerHTML = liNodes;
            list.classList.remove('hidden');
            submit.classList.remove('hidden');
            downloadBtn.classList.add('hidden');
            alertNode.classList.add('hidden');
            downloadBtn.href = '';
        }
    });

    submit.addEventListener('click', function(event) {
        event.preventDefault();
        spinner.classList.remove('hidden');
        submit.disabled = true;
        var filesSelected = input.files;

        sendData('/', filesSelected, function(response) {
            spinner.classList.add('hidden');
            list.innerHTML = '';
            submit.classList.add('hidden');
            submit.disabled = false;
            downloadBtn.href = response.url;
            downloadBtn.classList.remove('hidden');
            alertNode.classList.remove('hidden');
            label.textContent = 'Выбрать файлы';

            setTimeout(function() {
                alertNode.classList.add('hidden');
                downloadBtn.classList.add('hidden');
            }, 10 * 60 * 1000);
        });
    });
});

function sendData(url, files, callback) {
    var formData = new FormData();

    Array.from(files).forEach(file => {
        formData.append('logs', file);
    });

    fetch(url, {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(callback);
}
