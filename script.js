'use strict';

const supabaseUrl = 'https://kexajkcqeyuaywcszsfa.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleGFqa2NxZXl1YXl3Y3N6c2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDgwNTEsImV4cCI6MjA5NjkyNDA1MX0.Xm5B9VQtOwg5zJlJvyKB0dJq6id35X9hcmqbMIptFsc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Router Interface Mappings
  const viewMarketingWrapper = document.getElementById(
    'view-marketing-wrapper',
  );
  const viewLandlord = document.getElementById('view-landlord');
  const viewTenant = document.getElementById('view-tenant');

  const brandHome = document.getElementById('brand-home');
  const btnLogout = document.getElementById('btn-logout');
  const mainWebLinks = document.querySelectorAll('.main-web-link');

  const loginBox = document.getElementById('auth-login-box');
  const registerBox = document.getElementById('auth-register-box');
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const valuationForm = document.getElementById('form-valuation');

  // Nav Services Dropdown Functionality
  const dropdownTrigger = document.querySelector('.dropdown-trigger');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  if (dropdownTrigger && dropdownMenu) {
    dropdownTrigger.addEventListener('click', e => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('is-active');
    });
    document.addEventListener('click', () =>
      dropdownMenu.classList.remove('is-active'),
    );
  }

  // Unified Application View Router Switchboard
  function switchView(activeView) {
    [viewMarketingWrapper, viewLandlord, viewTenant].forEach(v => {
      if (v) v.classList.add('style-hidden');
    });

    activeView.classList.remove('style-hidden');

    if (activeView === viewMarketingWrapper) {
      if (btnLogout) btnLogout.classList.add('style-hidden');
      mainWebLinks.forEach(link => link.classList.remove('style-hidden'));
    } else {
      // Active Dashboard Session State
      if (btnLogout) btnLogout.classList.remove('style-hidden');
      mainWebLinks.forEach(link => link.classList.add('style-hidden'));
    }
  }

  if (brandHome) {
    brandHome.addEventListener('click', e => {
      e.preventDefault();
      switchView(viewMarketingWrapper);
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (loginForm) loginForm.reset();
      switchView(viewMarketingWrapper);
    });
  }

  // Auth Card Sub-State Switching Inside Side-by-Side Panel
  document.getElementById('go-to-register')?.addEventListener('click', () => {
    loginBox.classList.add('style-hidden');
    registerBox.classList.remove('style-hidden');
  });

  document.getElementById('go-to-login')?.addEventListener('click', () => {
    registerBox.classList.add('style-hidden');
    loginBox.classList.remove('style-hidden');
  });

  document.getElementById('reg-role')?.addEventListener('change', e => {
    document.querySelectorAll('.id-conditional-field').forEach(field => {
      if (e.target.value === 'tenant') {
        field.classList.add('style-hidden');
      } else {
        field.classList.remove('style-hidden');
      }
    });
  });

  // MARKETING SUBMISSION ENGINE: Valuation Form
  if (valuationForm) {
    valuationForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fullName = document.getElementById('val-name').value.trim();
      const email = document.getElementById('val-email').value.trim();
      const propertyLocation = document.getElementById('val-location').value;

      try {
        const { error } = await supabaseClient
          .from('valuation_requests')
          .insert([
            {
              full_name: fullName,
              email: email,
              property_location: propertyLocation,
              status: 'new',
            },
          ]);

        if (error) throw error;

        alert(
          `Thank you ${fullName}! Your valuation request for ${propertyLocation.toUpperCase()} has been saved successfully.`,
        );
        valuationForm.reset();
      } catch (err) {
        console.error('Valuation Engine Error:', err);
        alert('Data transmission fault uploading details: ' + err.message);
      }
    });
  }

  // SYSTEM GATEWAY ENGINE: Router Login
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const inputVal = document.getElementById('login-email').value.trim();
      const submitBtn = document.getElementById('btn-login-submit');

      submitBtn.textContent = 'Verifying Credentials...';
      submitBtn.disabled = true;

      try {
        if (inputVal.includes('@')) {
          // A. Landlord Evaluation Router
          const { data: landlords, error: llError } = await supabaseClient
            .from('landlords')
            .select('id, name, location')
            .eq('email', inputVal.toLowerCase());

          if (llError) throw llError;

          if (landlords && landlords.length > 0) {
            const currentLandlord = landlords[0];

            // Fixed Query: Fetching matching records linked directly to this landlord's id
            const { data: correlatedTenants, error: corrError } =
              await supabaseClient
                .from('tenants')
                .select('*')
                .eq('landlord_id', currentLandlord.id);

            if (corrError) throw corrError;

            currentLandlord.tenants = correlatedTenants || [];
            renderLandlordDashboard(currentLandlord);
            switchView(viewLandlord);
            return;
          }
        } else {
          // B. Tenant Evaluation Router - Fixed Column targeting tenant_id instead of id
          const { data: tenants, error: tnError } = await supabaseClient
            .from('tenants')
            .select('*')
            .eq('tenant_id', inputVal);

          if (tnError) throw tnError;

          if (tenants && tenants.length > 0) {
            renderTenantDashboard(tenants[0]);
            switchView(viewTenant);
            return;
          }
        }
        alert(
          `Identity profile credentials match not found for: "${inputVal}"`,
        );
      } catch (err) {
        console.error('System Access Routing Disruption:', err);
        alert('Database lookup connection disruption: ' + err.message);
      } finally {
        submitBtn.textContent = 'Enter Dashboard';
        submitBtn.disabled = false;
      }
    });
  }

  // REGISTRATION PIPELINE WORKFLOW ENGINE
  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const role = document.getElementById('reg-role').value;
      const name = document.getElementById('reg-name').value.trim();
      const email = document
        .getElementById('reg-email')
        .value.trim()
        .toLowerCase();
      const location = document.getElementById('reg-location').value.trim();
      const submitBtn = document.getElementById('btn-register-submit');

      submitBtn.textContent = 'Creating Account...';
      submitBtn.disabled = true;

      try {
        if (role === 'landlord') {
          const { error } = await supabaseClient
            .from('landlords')
            .insert([{ name, email, location }]);

          if (error) throw error;
          alert(
            'Landlord registered successfully! Log in using your email address.',
          );
        } else {
          const { data: newTenant, error } = await supabaseClient
            .from('tenants')
            .insert([{ name, paid: 0, balance: 0 }])
            .select();

          if (error) throw error;

          const generatedId = newTenant[0]?.tenant_id;
          alert(
            `Tenant profile saved! IMPORTANT: Your secure system Login ID token is:\n\n${generatedId}`,
          );
        }
        registerForm.reset();
        document.getElementById('go-to-login').click();
      } catch (err) {
        console.error('Registration Fault:', err);
        alert('Registration failed: ' + err.message);
      } finally {
        submitBtn.textContent = 'Register Account';
        submitBtn.disabled = false;
      }
    });
  }

  // EXECUTIVE UI LEDGER GENERATION ENGINES
  function renderLandlordDashboard(landlord) {
    document.getElementById('landlord-name').textContent =
      `Welcome Back, ${landlord.name}`;
    document.getElementById('landlord-meta').textContent =
      `Operations Base: ${landlord.location.toUpperCase()}`;
    const rowsContainer = document.getElementById('ll-tenant-rows');
    rowsContainer.innerHTML = '';

    let totalPaid = 0;
    let totalBal = 0;

    if (!landlord.tenants || landlord.tenants.length === 0) {
      rowsContainer.innerHTML = `<tr><td colspan="4" class="table-empty">No active tenants assigned.</td></tr>`;
    } else {
      landlord.tenants.forEach(t => {
        totalPaid += Number(t.paid || 0);
        totalBal += Number(t.balance || 0);
        rowsContainer.insertAdjacentHTML(
          'beforeend',
          `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td style="font-size:0.8rem; color:#a0a5aa; font-family:monospace;">${t.tenant_id}</td>
            <td class="value--paid">ZMW ${Number(t.paid).toFixed(2)}</td>
            <td class="value--balance">ZMW ${Number(t.balance).toFixed(2)}</td>
          </tr>
        `,
        );
      });
    }
    document.getElementById('ll-total-paid').textContent =
      `ZMW ${totalPaid.toFixed(2)}`;
    document.getElementById('ll-total-balance').textContent =
      `ZMW ${totalBal.toFixed(2)}`;
  }

  function renderTenantDashboard(tenant) {
    document.getElementById('tenant-heading').textContent =
      `Resident Portal: ${tenant.name}`;
    document.getElementById('tn-paid').textContent =
      `ZMW ${Number(tenant.paid).toFixed(2)}`;
    document.getElementById('tn-balance').textContent =
      `ZMW ${Number(tenant.balance).toFixed(2)}`;
  }
});
