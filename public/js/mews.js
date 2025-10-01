const form = document.querySelector('form');
const errorElement = document.querySelector('.error-message');
const loadingElement = document.querySelector('.loading');
const mewsElement = document.querySelector('.mews');
const loadMoreElement = document.querySelector('#loadMore');

const mewsUrl =  '/meows/v2/mews'

let skip = 0;
let limit = 20;
let loading = false;
let finished = false;

errorElement.style.display = 'none';

document.addEventListener('scroll', () => {
  const rect = loadMoreElement.getBoundingClientRect();
  if (rect.top < window.innerHeight && !loading && !finished) {
    loadMore();
  }
});

listAllMews();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const name = formData.get('name');
  const content = formData.get('content');

  if (name.trim() && content.trim()) {
    errorElement.style.display = 'none';
    form.style.display = 'none';
    loadingElement.style.display = '';

    const mew = {
      name,
      content
    };

    fetch(mewsUrl, {
      method: 'POST',
      body: JSON.stringify(mew),
      headers: {
        'content-type': 'application/json'
      }
    }).then(response => {
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType.includes('json')) {
          return response.json().then(error => Promise.reject(error.message));
        } else {
          return response.text().then(message => Promise.reject(message));
        }
      }
    }).then(() => {
      form.reset();
      setTimeout(() => {
        form.style.display = '';
      }, 10000);
      setTimeout(listAllMews, 1500)
    }).catch(errorMessage => {
      form.style.display = '';
      errorElement.textContent = errorMessage;
      errorElement.style.display = '';
      loadingElement.style.display = 'none';
    });
  } else {
    errorElement.textContent = 'Name and content are required!';
    errorElement.style.display = '';
  }
});

function loadMore() {
  skip += limit;
  listAllMews(false);
}

function listAllMews(reset = true) {
    loading = true;
    if (reset) {
        mewsElement.innerHTML = '';
        skip = 0;
        finished = false;
    }

    const url = `${mewsUrl}?skip=${skip}&limit=${limit}`

    const options =  { method: 'GET', mode: 'no-cors' }

    fetch(url, {options})
        .then(response => response.json())
        .then(result => {
        result.mews.forEach(mew => {
            const div = document.createElement('div');

            const r = document.createElement('div');
            r.classList.add('row')
            const col1 = document.createElement('div');
            col1.classList.add('col-sm-3')

            const header = document.createElement('h4');
            header.textContent = mew.name;


            const col2 = document.createElement('div');
            col2.classList.add('col-sm-9')

            const contents = document.createElement('p');
            contents.textContent = mew.content;

            const date = document.createElement('small');
            date.textContent = new Date(mew.created);


            col1.appendChild(header)
            col2.appendChild(contents);
            col2.appendChild(date);
            r.appendChild(col1)
            r.appendChild(col2)
            div.appendChild(r);


            mewsElement.appendChild(div);
        });
        loadingElement.style.display = 'none';
        if (!result.meta.has_more) {
            loadMoreElement.style.visibility = 'hidden';
            finished = true;
        } else {
            loadMoreElement.style.visibility = 'visible';
        }
        loading = false;
    });
}