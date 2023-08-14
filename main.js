const API_URL = 'https://api.coincap.io/v2/';
const MAX_SELECTED_COINS = 5;
let selectedCoins = [];

async function fetchCoinInfo(coinId) {
    try {
        const response = await fetch(`${API_URL}/assets/${coinId}`);
        if (!response.ok) {
            throw new Error('Coin not found');
        }
        const data = await response.json();
        return {
            description: data.data?.description || 'Description not available',
        };
    } catch (error) {
        console.error('Error fetching coin info:', error);
        return {
            description: 'Description not available',
        };
    }
}

async function fetchCoinsData() {
    try {
        const response = await fetch(`${API_URL}assets?limit=100`);
        if (!response.ok) {
            throw new Error('Failed to fetch coin data');
        }
        const data = await response.json();
        const coinCards = document.getElementById('coin-cards');
        coinCards.innerHTML = '';

        const promises = data.data.map(async (coin) => {
            try {
                const coinInfo = await fetchCoinInfo(coin.id);
                return {
                    coin,
                    coinInfo,
                };
            } catch (error) {
                console.error('Error fetching coin info:', error);
                return null;
            }
        });

        const coinInfoList = await Promise.all(promises);

        const validCoins = coinInfoList.filter((item) => item !== null);

        const coinHTML = validCoins.map((item) => {
            const { coin, coinInfo } = item;
            const buttonLabel = selectedCoins.includes(coin.symbol.toUpperCase())
                ? 'Remove This Coin'
                : 'Select Coin';
            const buttonClass = selectedCoins.includes(coin.symbol.toUpperCase())
                ? 'btn-danger'
                : 'btn-primary';

            return `
                <div class="col-md-4 mb-4">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${coin.symbol.toUpperCase()}</h5>
                            <p class="card-text">${coinInfo.description}</p>
                            <button class="btn ${buttonClass}" data-coin-id="${coin.id}" data-coin-symbol="${coin.symbol.toUpperCase()}" onclick="addSelectedCoin('${coin.symbol.toUpperCase()}')">${buttonLabel}</button>
                        </div>
                    </div>
                </div>
            `;
        });

        coinCards.innerHTML = coinHTML.join('');
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function addSelectedCoin(coin) {
    const index = selectedCoins.indexOf(coin);
    if (index === -1) {
        if (selectedCoins.length < MAX_SELECTED_COINS) {
            selectedCoins.push(coin);
        } else {
            // Show a message or alert when the max limit is reached
            console.log('Max number of coins reached.');
        }
    } else {
        selectedCoins.splice(index, 1);
    }
    updateSelectedCoinsCounter();
    updateChangeCoinButton();
    displayLiveReports();
    fetchCoinsData(); // Update coin cards after selection
}

document.getElementById('change-coin-btn').addEventListener('click', () => {
    const modalBody = document.querySelector('#changeCoinModal .modal-body');
    modalBody.innerHTML = selectedCoins.map((coin) => `
        <div class="form-check">
            <input class="form-check-input" type="radio" name="changeCoinRadio" value="${coin}">
            <label class="form-check-label">${coin}</label>
        </div>
    `).join('');
    $('#changeCoinModal').modal('show');
});

function updateChangeCoinButton() {
    const changeCoinButton = document.getElementById('change-coin-btn');
    const selectedCoinsCounter = document.getElementById('selected-coins-counter');
    if (selectedCoins.length === MAX_SELECTED_COINS) {
        changeCoinButton.style.display = 'block';
        selectedCoinsCounter.classList.add('max-coins-reached');
    } else {
        changeCoinButton.style.display = 'none';
        selectedCoinsCounter.classList.remove('max-coins-reached');
    }
}

function displayLiveReports() {
    const ctx = document.getElementById('live-reports-chart').getContext('2d');
    const selectedCoinData = getSelectedCoinData();

    const chart = new Chart(ctx, {
        type: 'line', // Use a line chart instead of candlestick
        data: {
            datasets: selectedCoinData.datasets,
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                    },
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        drawBorder: false,
                    },
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
            },
            responsive: true,
            maintainAspectRatio: false,
        },
    });
}

async function getSelectedCoinData() {
    const coinIds = selectedCoins.join(',');
    const fromDate = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000); 

    try {
        const response = await fetch(`${API_URL}/candles`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            params: {
                interval: 'd1', 
                baseId: coinIds,
                startTime: fromDate,
                endTime: Math.floor(Date.now() / 1000),
            },
        });
        const data = await response.json();

        const datasets = selectedCoins.map((coin, index) => {
            const coinData = data.data[index].candles;
            return {
                label: coin,
                data: coinData.map(d => ({
                    t: new Date(d.period),
                    y: d.open, 
                })),
                borderColor: getRandomColor(),
                borderWidth: 1,
                fill: false, 
            };
        });

        return { datasets };
    } catch (error) {
        console.error('Error fetching data:', error);
        return { datasets: [] };
    }
}

async function updateChartData() {
    const selectedCoinData = await getSelectedCoinData();
    const chart = Chart.getChart('live-reports-chart');
    if (chart) {
        chart.data.datasets = selectedCoinData.datasets;
        chart.update();
    }
}

function updateSelectedCoinsCounter() {
    document.getElementById('selected-coins-counter').textContent = selectedCoins.length;
}

function handleNavigationClick(event) {
    event.preventDefault();
    const targetPath = event.target.getAttribute('href');
    showSection(targetPath);
}

function showSection(sectionPath) {
    const sections = document.getElementsByTagName('section');
    for (const section of sections) {
        if (section.id === sectionPath) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    }
}

function handleNavigationClick(event) {
    event.preventDefault();
    const targetPath = event.target.getAttribute('href');
    if (targetPath) {
        const relativePath = targetPath.split('/').pop();
        showSection(relativePath);
    }
}

function showSection(sectionPath) {
    const sections = document.getElementsByTagName('section');
    for (const section of sections) {
        if (section.id === sectionPath) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    }
}

function addNavigationListeners() {
    const navigationLinks = document.querySelectorAll('.navbar-nav .nav-link');
    for (const link of navigationLinks) {
        link.addEventListener('click', handleNavigationClick);
    }
}

function initApp() {
    addNavigationListeners();
    fetchCoinsData();
    displayLiveReports();
    updateSelectedCoinsCounter();
    updateChangeCoinButton();
}

initApp();
