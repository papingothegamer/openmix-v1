<script>
  export let label = 'Enabled';
  export let value = false;
  // Fixed: Removed unused 'min' and 'max'
  export let onChange = (val) => {}; // Fixed: Added parameter

  function handleToggle() {
    onChange(!value);
  }
</script>

<div class="toggle-container">
  <button
    type="button"
    class="toggle-button"
    class:active={value}
    aria-pressed={value}
    on:click={handleToggle}
  >
    <span class="toggle-indicator">
      {#if value}
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      {/if}
    </span>
  </button>

  <span class="toggle-label">{label}</span>
</div>

<style>
  .toggle-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  .toggle-button {
    width: 36px;
    height: 36px;
    border: 2px solid #3a3a3a;
    border-radius: 8px;
    background: linear-gradient(180deg, #1d1d1d 0%, #151515 100%);
    color: #00ced1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s, transform 0.15s;
    padding: 0;
  }

  .toggle-button:hover {
    border-color: rgba(0, 206, 209, 0.8);
  }

  .toggle-button:active {
    transform: translateY(1px);
  }

  .toggle-button:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 206, 209, 0.18), 0 0 10px rgba(0, 206, 209, 0.22);
    border-color: #00ced1;
  }

  .toggle-button.active {
    background: rgba(0, 206, 209, 0.1);
    border-color: #00ced1;
    box-shadow: 0 0 8px rgba(0, 206, 209, 0.28);
  }

  .toggle-indicator {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggle-button svg {
    width: 20px;
    height: 20px;
  }

  .toggle-label {
    font-size: 0.7rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    text-align: center;
  }
</style>