'use strict';

// 1. Initialize Supabase Client with your real credentials
const supabaseUrl = 'https://kexajkcqeyuaywcszsfa.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleGFqa2NxZXl1YXl3Y3N6c2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDgwNTEsImV4cCI6MjA5NjkyNDA1MX0.Xm5B9VQtOwg5zJlJvyKB0dJq6id35X9hcmqbMIptFsc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. DROPDOWN MENU LOGIC
  // ==========================================
  const trigger = document.querySelector('.dropdown-trigger');
  const menu = document.querySelector('.dropdown-menu');

  if (trigger && menu) {
    // Toggle dropdown when clicking 'Services'
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.toggle('is-active');
    });

    // Close the dropdown if the user clicks anywhere else on the screen
    document.addEventListener('click', () => {
      if (menu.classList.contains('is-active')) {
        menu.classList.remove('is-active');
      }
    });
  }

  // ==========================================
  // 2. SUPABASE INTAKE FORM LOGIC
  // ==========================================
  const contactForm = document.querySelector('.contact__form');

  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault(); // Stop page reload

      // Grab values from inputs dynamically
      const fullName = contactForm.querySelector('input[type="text"]').value;
      const email = contactForm.querySelector('input[type="email"]').value;
      const propertyLocation = contactForm.querySelector(
        '.form-group__select',
      ).value;
      const submitBtn = contactForm.querySelector('.contact__submit');

      // Set loading state
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      // Insert data into your live Postgres table
      const { data, error } = await supabaseClient
        .from('valuation_requests')
        .insert([
          {
            full_name: fullName,
            email: email,
            property_location: propertyLocation,
          },
        ]);

      // Reset button and check result
      submitBtn.textContent = 'Request Free Valuation';
      submitBtn.disabled = false;

      if (error) {
        console.error('Error saving data:', error.message);
        alert('Something went wrong. Please try again.');
      } else {
        alert('Thank you! Your valuation request has been submitted.');
        contactForm.reset(); // Clear the form fields
      }
    });
  }
}); // <─── This now correctly wraps both codebases cleanly!
