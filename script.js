'use strict';

const supabaseUrl = 'https://kexajkcqeyuaywcszsfa.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleGFqa2NxZXl1YXl3Y3N6c2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDgwNTEsImV4cCI6MjA5NjkyNDA1MX0.Xm5B9VQtOwg5zJlJvyKB0dJq6id35X9hcmqbMIptFsc';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

/**
 * 1. DATABASE SERVICE MODULE
 * Handles data fetching, registration logic, and identity generation.
 */
class DatabaseService {
  constructor(client) {
    this.db = client;
  }

  /**
   * Generates unique short IDs (e.g., th1024 -> tho1024) based on landlord name prefix.
   */
  async generateCustomTenantId(landlordName) {
    const namePrefix = landlordName.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const lettersBase = namePrefix.length >= 2 ? namePrefix : 'tn';
    const randomNumberBlock = Math.floor(1000 + Math.random() * 9000);

    let characterLength = 2;
    let isUnique = false;
    let finalGeneratedId = '';

    while (!isUnique && characterLength <= lettersBase.length) {
      const letterSlice = lettersBase.substring(0, characterLength);
      finalGeneratedId = `${letterSlice}${randomNumberBlock}`;

      const { data, error } = await this.db
        .from('tenants')
        .select('tenant_id')
        .eq('tenant_id', finalGeneratedId);

      if (error) {
        console.error('Collision verification safety warning:', error);
        break;
      }

      if (!data || data.length === 0) {
        isUnique = true;
      } else {
        characterLength++;
      }
    }

    if (!isUnique) {
      finalGeneratedId = `${lettersBase.substring(0, 2)}${randomNumberBlock}_${Math.floor(10 + Math.random() * 90)}`;
    }

    return finalGeneratedId;
  }

  async insertValuationRequest(fullName, email, propertyLocation) {
    return await this.db.from('valuation_requests').insert([
      {
        full_name: fullName,
        email: email,
        property_location: propertyLocation,
        status: 'new',
      },
    ]);
  }

  async getLandlordByEmail(email) {
    return await this.db
      .from('landlords')
      .select('id, name, location')
      .eq('email', email.toLowerCase());
  }

  async getLandlordByName(name) {
    return await this.db
      .from('landlords')
      .select('id, name, location')
      .eq('name', name);
  }

  // RECOVERY FEATURE: Look up landlord via Full Name
  async recoverLandlordByName(name) {
    return await this.db
      .from('landlords')
      .select('name, email')
      .eq('name', name);
  }

  // RECOVERY FEATURE: Look up tenant via Full Name
  async recoverTenantByName(name) {
    return await this.db
      .from('tenants')
      .select('name, tenant_id')
      .eq('name', name);
  }

  async getTenantsByLandlordId(landlordId) {
    return await this.db
      .from('tenants')
      .select('*')
      .eq('landlord_id', landlordId);
  }

  async getTenantById(tenantId) {
    return await this.db.from('tenants').select('*').eq('tenant_id', tenantId);
  }

  async registerLandlord(name, email, location) {
    return await this.db.from('landlords').insert([{ name, email, location }]);
  }

  async registerTenant(name, shortTenantId, landlordId) {
    return await this.db
      .from('tenants')
      .insert([
        {
          tenant_id: shortTenantId,
          name: name,
          paid: 0,
          balance: 0,
          landlord_id: landlordId,
        },
      ])
      .select();
  }
}

/**
 * 2. UI TRANSITION & RENDERING SERVICE MODULE
 * Handles view switching, smooth anchors, dropdown states, and DOM mutations.
 */
class UIService {
  constructor() {
    this.viewMarketingWrapper = document.getElementById(
      'view-marketing-wrapper',
    );
    this.viewLandlord = document.getElementById('view-landlord');
    this.viewTenant = document.getElementById('view-tenant');
    this.btnLogout = document.getElementById('btn-logout');
    this.mainWebLinks = document.querySelectorAll('.main-web-link');

    this.loginBox = document.getElementById('auth-login-box');
    this.registerBox = document.getElementById('auth-register-box');
    this.recoveryModal = document.getElementById('modal-recovery');
  }

  switchView(activeView) {
    [this.viewMarketingWrapper, this.viewLandlord, this.viewTenant].forEach(
      v => {
        if (v) v.classList.add('style-hidden');
      },
    );

    activeView.classList.remove('style-hidden');

    if (activeView === this.viewMarketingWrapper) {
      if (this.btnLogout) this.btnLogout.classList.add('style-hidden');
      this.mainWebLinks.forEach(link => link.classList.remove('style-hidden'));
    } else {
      if (this.btnLogout) this.btnLogout.classList.remove('style-hidden');
      this.mainWebLinks.forEach(link => link.classList.add('style-hidden'));
    }
  }

  showRegisterBox() {
    this.loginBox?.classList.add('style-hidden');
    this.registerBox?.classList.remove('style-hidden');
  }

  showLoginBox() {
    this.registerBox?.classList.add('style-hidden');
    this.loginBox?.classList.remove('style-hidden');
  }

  openRecoveryModal() {
    this.recoveryModal?.classList.remove('style-hidden');
  }

  closeRecoveryModal() {
    this.recoveryModal?.classList.add('style-hidden');
    document.getElementById('form-recovery')?.reset();
  }

  toggleConditionalFields(role) {
    document.querySelectorAll('.id-conditional-field').forEach(field => {
      if (role === 'tenant') {
        field.classList.add('style-hidden');
      } else {
        field.classList.remove('style-hidden');
      }
    });
  }

  renderLandlordDashboard(landlord) {
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

  renderTenantDashboard(tenant) {
    document.getElementById('tenant-heading').textContent =
      `Resident Portal: ${tenant.name}`;
    document.getElementById('tn-paid').textContent =
      `ZMW ${Number(tenant.paid).toFixed(2)}`;
    document.getElementById('tn-balance').textContent =
      `ZMW ${Number(tenant.balance).toFixed(2)}`;
  }
}

/**
 * 3. MAIN APPLICATION ENGINE CONTROLLER
 * Coordinates interaction between UI actions and Backend communications.
 */
class AppController {
  constructor(dbService, uiService) {
    this.dbService = dbService;
    this.uiService = uiService;

    this.loginForm = document.getElementById('form-login');
    this.registerForm = document.getElementById('form-register');
    this.valuationForm = document.getElementById('form-valuation');
    this.recoveryForm = document.getElementById('form-recovery');
  }

  init() {
    this.setupNavigationListeners();
    this.setupAuthInterfaceListeners();
    this.setupFormSubmissionListeners();
  }

  setupNavigationListeners() {
    document.getElementById('brand-home')?.addEventListener('click', e => {
      e.preventDefault();
      this.uiService.switchView(this.uiService.viewMarketingWrapper);
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      this.loginForm?.reset();
      this.uiService.switchView(this.uiService.viewMarketingWrapper);
    });

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

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        e.preventDefault();
        const targetElement = document.querySelector(
          anchor.getAttribute('href'),
        );
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  setupAuthInterfaceListeners() {
    document
      .getElementById('go-to-register')
      ?.addEventListener('click', () => this.uiService.showRegisterBox());
    document
      .getElementById('go-to-login')
      ?.addEventListener('click', () => this.uiService.showLoginBox());

    document.getElementById('reg-role')?.addEventListener('change', e => {
      this.uiService.toggleConditionalFields(e.target.value);
    });

    // Recovery Modal Display Triggers
    document
      .getElementById('link-forgot-credentials')
      ?.addEventListener('click', e => {
        e.preventDefault();
        this.uiService.openRecoveryModal();
      });

    document
      .getElementById('btn-close-recovery')
      ?.addEventListener('click', () => {
        this.uiService.closeRecoveryModal();
      });

    document.getElementById('modal-recovery')?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-recovery')) {
        this.uiService.closeRecoveryModal();
      }
    });
  }

  setupFormSubmissionListeners() {
    // RECOVERY SUBMISSION ENGINE
    if (this.recoveryForm) {
      this.recoveryForm.addEventListener('submit', async e => {
        e.preventDefault();
        const searchName = document
          .getElementById('recovery-name')
          .value.trim();
        const submitBtn = document.getElementById('btn-recovery-submit');

        submitBtn.textContent = 'Searching Registry...';
        submitBtn.disabled = true;

        try {
          // Look up landlords
          const { data: landlordMatch, error: llErr } =
            await this.dbService.recoverLandlordByName(searchName);
          if (llErr) throw llErr;

          if (landlordMatch && landlordMatch.length > 0) {
            alert(
              `Account Profile Found!\n\nRole: Landlord / Property Owner\nRegistered Email: ${landlordMatch[0].email}\n\nUse this email to access your tracking portal.`,
            );
            this.uiService.closeRecoveryModal();
            return;
          }

          // Look up tenants
          const { data: tenantMatch, error: tnErr } =
            await this.dbService.recoverTenantByName(searchName);
          if (tnErr) throw tnErr;

          if (tenantMatch && tenantMatch.length > 0) {
            alert(
              `Account Profile Found!\n\nRole: Tenant Resident\nSecure Login ID: ${tenantMatch[0].tenant_id}\n\nUse this secure alphanumeric short token to enter your portal dashboard.`,
            );
            this.uiService.closeRecoveryModal();
            return;
          }

          alert(
            `No registered account profile found matching the name "${searchName}". Please check the spelling or ensure your account registration was completed.`,
          );
        } catch (err) {
          console.error('Credential Retrieval System Disruption:', err);
          alert('Failed to connect to the database registry: ' + err.message);
        } finally {
          submitBtn.textContent = 'Search Registry';
          submitBtn.disabled = false;
        }
      });
    }

    if (this.valuationForm) {
      this.valuationForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fullName = document.getElementById('val-name').value.trim();
        const email = document.getElementById('val-email').value.trim();
        const propertyLocation = document.getElementById('val-location').value;

        try {
          const { error } = await this.dbService.insertValuationRequest(
            fullName,
            email,
            propertyLocation,
          );
          if (error) throw error;

          alert(
            `Thank you ${fullName}! Your valuation request for ${propertyLocation.toUpperCase()} has been saved successfully.`,
          );
          this.valuationForm.reset();
        } catch (err) {
          console.error('Valuation Engine Error:', err);
          alert('Data transmission fault uploading details: ' + err.message);
        }
      });
    }

    if (this.loginForm) {
      this.loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const inputVal = document.getElementById('login-email').value.trim();
        const submitBtn = document.getElementById('btn-login-submit');

        submitBtn.textContent = 'Verifying Credentials...';
        submitBtn.disabled = true;

        try {
          if (inputVal.includes('@')) {
            const { data: landlords, error: llError } =
              await this.dbService.getLandlordByEmail(inputVal);
            if (llError) throw llError;

            if (landlords && landlords.length > 0) {
              const currentLandlord = landlords[0];
              const { data: correlatedTenants, error: corrError } =
                await this.dbService.getTenantsByLandlordId(currentLandlord.id);
              if (corrError) throw corrError;

              currentLandlord.tenants = correlatedTenants || [];
              this.uiService.renderLandlordDashboard(currentLandlord);
              this.uiService.switchView(this.uiService.viewLandlord);
              return;
            }
          } else {
            const { data: tenants, error: tnError } =
              await this.dbService.getTenantById(inputVal);
            if (tnError) throw tnError;

            if (tenants && tenants.length > 0) {
              this.uiService.renderTenantDashboard(tenants[0]);
              this.uiService.switchView(this.uiService.viewTenant);
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

    if (this.registerForm) {
      this.registerForm.addEventListener('submit', async e => {
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
            const { error } = await this.dbService.registerLandlord(
              name,
              email,
              location,
            );
            if (error) throw error;
            alert(
              'Landlord registered successfully! Log in using your email address.',
            );
          } else {
            const landlordVerificationName = prompt(
              "Please provide the Landlord's Full Name to link this account and generate your short Tenant ID code:",
            );

            if (
              !landlordVerificationName ||
              landlordVerificationName.trim().length < 2
            ) {
              alert(
                'A valid landlord full name is required to assemble your login key.',
              );
              return;
            }

            const { data: linkedLandlords, error: searchError } =
              await this.dbService.getLandlordByName(
                landlordVerificationName.trim(),
              );
            if (searchError) throw searchError;

            if (!linkedLandlords || linkedLandlords.length === 0) {
              alert(
                'The landlord name provided does not match any registered profiles. Please verify the exact spelling or ensure they sign up first.',
              );
              return;
            }

            const resolvedLandlordId = linkedLandlords[0].id;
            const uniqueShortTenantId =
              await this.dbService.generateCustomTenantId(
                landlordVerificationName.trim(),
              );

            const { data: newTenant, error } =
              await this.dbService.registerTenant(
                name,
                uniqueShortTenantId,
                resolvedLandlordId,
              );
            if (error) throw error;

            const generatedId = newTenant[0]?.tenant_id;
            alert(
              `Tenant profile saved! IMPORTANT: Your friendly system Login ID token is:\n\n${generatedId}`,
            );
          }
          this.registerForm.reset();
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
  }
}

// APPLICATION ORCHESTRATION BOOTSTRAPPER
document.addEventListener('DOMContentLoaded', () => {
  const dbService = new DatabaseService(supabaseClient);
  const uiService = new UIService();
  const app = new AppController(dbService, uiService);

  app.init();
});

// Function to display the consolidated modal
function showRegistrationModal(role, token, landlordEmail) {
  const modal = document.getElementById('customModal');
  const modalBody = document.getElementById('modalBody');
  const closeBtn = document.getElementById('modalCloseBtn');

  // Build the clean HTML structure inside the text box
  modalBody.innerHTML = `
    <p><strong>Role:</strong> ${role}</p>
    <p><strong>Secure Login ID:</strong> <span style="color: #c8a261; font-family: monospace;">${token}</span></p>
    <p><strong>Linked Landlord:</strong> ${landlordEmail}</p>
    <p style="font-size: 0.9rem; color: #aaa; margin-top: 15px;">
      Use this secure alphanumeric short token to enter your portal dashboard.
    </p>
  `;

  // Show the modal by removing the hidden class
  modal.classList.remove('hidden');

  // Close event listener
  closeBtn.onclick = function () {
    modal.classList.add('hidden');
    // Optional: redirect user or clear input form fields here
  };
}

// --- Example Usage inside your workflow ---
// script.js triggered after Supabase finishes registry processing
const mockRole = 'Tenant Resident';
const mockToken = 'th7609';
const mockLandlord = 'gakumuthomas@gmail.com';

// Trigger it cleanly
showRegistrationModal(mockRole, mockToken, mockLandlord);
