/**
 * @typedef {'idle' | 'loading' | 'success' | 'error'} WeatherState
 * @typedef {{
 *   searchTerm: string,
 *   state: WeatherState,
 *   data: object | null,
 *   error: string | null
 * }} DashboardState
 */

/**
 * Create a weather dashboard instance with state management
 * @returns {{
 *   getState: () => DashboardState,
 *   setSearchTerm: (term: string) => void,
 *   setLoading: () => void,
 *   setSuccess: (data: object) => void,
 *   setError: (message: string) => void,
 *   reset: () => void
 * }}
 */
function createWeatherDashboard() {
  /** @type {DashboardState} */
  let state = {
    searchTerm: "",
    state: "idle",
    data: null,
    error: null,
  };

  return {
    /**
     * Get the current state
     * @returns {DashboardState}
     */
    getState() {
      return {
        searchTerm: state.searchTerm,
        state: state.state,
        data: state.data,
        error: state.error,
      };
    },

    /**
     * Set the search term
     * @param {string} term
     */
    setSearchTerm(term) {
      state.searchTerm = term;
    },

    /**
     * Transition to loading state
     */
    setLoading() {
      state.state = "loading";
      state.error = null;
      state.data = null;
    },

    /**
     * Transition to success state with data
     * @param {object} data
     */
    setSuccess(data) {
      state.state = "success";
      state.data = data;
      state.error = null;
    },

    /**
     * Transition to error state
     * @param {string} message
     */
    setError(message) {
      state.state = "error";
      state.error = message;
      state.data = null;
    },

    /**
     * Reset the dashboard to initial state
     */
    reset() {
      state = {
        searchTerm: "",
        state: "idle",
        data: null,
        error: null,
      };
    },
  };
}

/**
 * Initialize the weather dashboard app
 */
function initApp() {
  const dashboard = createWeatherDashboard();

  const cityInput = document.getElementById("city-input");
  const searchBtn = document.getElementById("search-btn");
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const currentWeather = document.getElementById("current-weather");
  const forecastCards = document.getElementById("forecast-cards");

  // Render the current state
  function render() {
    const currentState = dashboard.getState();

    // Hide all sections initially
    if (loadingState) loadingState.style.display = "none";
    if (errorState) errorState.style.display = "none";
    if (currentWeather) currentWeather.style.display = "none";
    if (forecastCards) forecastCards.style.display = "none";

    // Show the appropriate section based on state
    if (currentState.state === "loading") {
      if (loadingState) loadingState.style.display = "block";
    } else if (currentState.state === "error") {
      if (errorState) {
        errorState.style.display = "block";
        errorState.textContent = currentState.error || "An error occurred";
      }
    } else if (currentState.state === "success") {
      if (currentWeather) currentWeather.style.display = "block";
      if (forecastCards) forecastCards.style.display = "block";
    }
  }

  // Handle search button click
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      if (cityInput && cityInput.value.trim()) {
        dashboard.setSearchTerm(cityInput.value.trim());
        dashboard.setLoading();
        render();
        // Note: Actual API call would happen here in a future subtask
      }
    });
  }

  // Handle Enter key in input
  if (cityInput) {
    cityInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchBtn?.click();
      }
    });
  }

  // Render initial state
  render();
}

// Initialize app when DOM is ready (only in browser environment)
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}

// Export for testing
export { createWeatherDashboard };
