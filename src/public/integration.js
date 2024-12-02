// Function to fetch and display the logged-in user's domains
    function fetchUserDomains() {
        const token = localStorage.getItem('token'); // Get token from localStorage or sessionStorage
        if (!token) {
            alert('You must be logged in to see your domains.');
            return;
        }

        fetch('https://bizbot-khpq.onrender.com/api/my-domains', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.domains && data.domains.length > 0) {
                const domainsList = document.getElementById('domains-list');
                domainsList.innerHTML = ''; // Clear the list first
                data.domains.forEach(domain => {
                    const listItem = document.createElement('li');
                    listItem.textContent = domain.domain;
                    domainsList.appendChild(listItem);
                });
            } else {
                document.getElementById('domains-list').innerHTML = 'No domains saved yet.';
            }
        })
        .catch(error => {
            console.error('Error fetching user domains:', error);
        });
    }
