// Admin Panel JavaScript
document.addEventListener("DOMContentLoaded", () => {
  // Initialize KPI Chart if canvas exists
  const chartCanvas = document.getElementById("kpiChart");
  if (chartCanvas) {
    const ctx = chartCanvas.getContext("2d");
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Users', 'Cars', 'Orders', 'Price Preds', 'Demand Preds'],
        datasets: [{
          label: 'Counts',
          data: [
            parseInt(document.querySelector('[data-kpi="users"]').textContent),
            parseInt(document.querySelector('[data-kpi="cars"]').textContent),
            parseInt(document.querySelector('[data-kpi="orders"]').textContent),
            parseInt(document.querySelector('[data-kpi="pricePreds"]').textContent),
            parseInt(document.querySelector('[data-kpi="demandPreds"]').textContent)
          ],
          backgroundColor: new Array(5).fill('rgba(255, 215, 0, 0.7)'),
          borderColor: new Array(5).fill('rgba(255, 215, 0, 1)'),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#fff'
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#fff'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff'
            }
          }
        }
      }
    });
  }

  // Initialize Monthly Sales Chart
  const monthlySalesCanvas = document.getElementById("monthlySalesChart");
  if (monthlySalesCanvas) {
    const ctx = monthlySalesCanvas.getContext("2d");

    const labels = JSON.parse(monthlySalesCanvas.dataset.labels || '[]');
    const values = JSON.parse(monthlySalesCanvas.dataset.values || '[]');
    const colors = labels.map((_, i) => `hsl(${i * 40}, 70%, 60%)`);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cars Sold',
          data: values,
          backgroundColor: colors,
          borderColor: '#FFD700',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Month',
              color: '#FFD700'
            },
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y: {
            title: {
              display: true,
              text: 'Cars Sold',
              color: '#FFD700'
            },
            beginAtZero: true,
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        plugins: {
          datalabels: {
            display: true,
            color: '#FFD700',
            font: {
              weight: 'bold'
            },
            anchor: 'end',
            align: 'start'
          },
          legend: {
            labels: {
              color: '#fff'
            }
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // Delete Confirmation
  const deleteButtons = document.querySelectorAll('.delete-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      if (!confirm('Are you sure you want to delete this item?')) {
        e.preventDefault();
      }
    });
  });

  // Form Handling
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: form.method,
          body: formData
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json();

        if (result.success) {
          alert('Operation successful!');
          if (result.redirect) {
            window.location.href = result.redirect;
          }
        } else {
          throw new Error(result.message || 'Operation failed');
        }
      } catch (error) {
        alert(error.message);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  });

  // KPI Card Hover Effects
  const kpiCards = document.querySelectorAll('.kpi-card');
  kpiCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.02)';
      card.style.borderColor = '#FFD700';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
      card.style.borderColor = '#333';
    });
  });
});
