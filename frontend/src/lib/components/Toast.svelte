<script>
    import { notifications } from '../notificationStore.js';
    import { CheckCircle, AlertCircle, Info, X } from 'lucide-svelte';
    import { flip } from 'svelte/animate';
    import { fly } from 'svelte/transition';

    function remove(id) {
        notifications.update(n => n.filter(t => t.id !== id));
    }
</script>

<div class="toast-container">
    {#each $notifications as toast (toast.id)}
        <div 
            class="toast {toast.type}" 
            animate:flip={{ duration: 300 }}
            transition:fly={{ y: 20, duration: 400 }}
        >
            <div class="toast-icon">
                {#if toast.type === 'success'}<CheckCircle size={18} />
                {:else if toast.type === 'error'}<AlertCircle size={18} />
                {:else}<Info size={18} />{/if}
            </div>
            <div class="toast-content">{toast.message}</div>
            <button class="toast-close" on:click={() => remove(toast.id)}>
                <X size={14} />
            </button>
        </div>
    {/each}
</div>

<style>
    .toast-container {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        z-index: 9999;
        pointer-events: none;
    }

    .toast {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: #1e293b;
        color: #f8fafc;
        border-radius: 8px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
        border: 1px solid #334155;
        min-width: 280px;
        max-width: 400px;
        font-family: 'Inter', sans-serif;
    }

    .toast.success { border-left: 4px solid #10b981; }
    .toast.error { border-left: 4px solid #ef4444; }
    .toast.info { border-left: 4px solid #3b82f6; }

    .toast-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .success .toast-icon { color: #10b981; }
    .error .toast-icon { color: #ef4444; }
    .info .toast-icon { color: #3b82f6; }

    .toast-content { flex: 1; font-size: 0.875rem; font-weight: 500; line-height: 1.4; color: #e2e8f0; }

    .toast-close {
        background: transparent; border: none; color: #64748b;
        cursor: pointer; padding: 2px; border-radius: 4px;
        transition: 0.2s; display: flex; align-items: center;
    }
    .toast-close:hover { background: #334155; color: #f8fafc; }
</style>
