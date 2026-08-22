document.addEventListener('DOMContentLoaded', () => {
    // Basic Carousel functionality for the Signature Blends section
    const productGrid = document.querySelector('.product-grid');
    const prevBtn = document.querySelector('.nav-btn.prev');
    const nextBtn = document.querySelector('.nav-btn.next');
    
    if (productGrid && prevBtn && nextBtn) {
        // Calculate scroll amount based on one card width + gap
        const getScrollAmount = () => {
            const card = productGrid.querySelector('.product-card');
            if (card) {
                return card.offsetWidth + 20; // 20px is the gap
            }
            return 300; // fallback
        };

        nextBtn.addEventListener('click', () => {
            productGrid.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
        });

        prevBtn.addEventListener('click', () => {
            productGrid.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
        });
    }

    // Add sticky header behavior on scroll
    const header = document.querySelector('.main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
            }
        });
    }
});
