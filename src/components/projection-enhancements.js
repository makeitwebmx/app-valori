// Simple script to enable multiple projection calculators
// This script modifies the Portfolio rendering without complex template string changes

(function () {
    console.log('[Projection Multi] Loading enhancement...');

    // Wait for DOM and state to be ready
    const init = () => {
        if (!window.state || !window.state.portfolio) {
            setTimeout(init, 100);
            return;
        }

        const investment = window.state.portfolio.investment;

        // Initialize expandedProjections if not exist
        if (!investment.expandedProjections) {
            investment.expandedProjections = [1]; // Expand first by default
        }

        // Ensure all projections have IDs
        investment.projections.forEach((proj, idx) => {
            if (!proj.id) proj.id = idx + 1;
        });

        // Override addProjection
        if (window.actions && window.actions.addProjection) {
            const original = window.actions.addProjection;
            window.actions.addProjection = () => {
                const newId = Date.now();
                investment.projections.push({
                    id: newId,
                    initial: 10000,
                    monthly: 500,
                    days: 365,
                    rate: 10,
                    variance: 17,
                    freq: 'ANUAL'
                });
                investment.expandedProjections.push(newId);
                if (window.updateUI) window.updateUI();
            };
        }

        // Override removeProjection
        if (window.actions && window.actions.removeProjection) {
            window.actions.removeProjection = (index) => {
                const projId = investment.projections[index].id;
                investment.projections.splice(index, 1);
                investment.expandedProjections = investment.expandedProjections.filter(id => id !== projId);
                if (window.updateUI) window.updateUI();
            };
        }

        // Add toggle function
        if (window.actions) {
            window.actions.toggleProjectionExpand = (projId) => {
                const idx = investment.expandedProjections.indexOf(projId);
                if (idx >= 0) {
                    investment.expandedProjections.splice(idx, 1);
                } else {
                    investment.expandedProjections.push(projId);
                }
                if (window.updateUI) window.updateUI();
            };
        }

        // Add calculation helpers
        window.calculateProjectionResult = (proj) => {
            const r = proj.rate / 100;
            const year = parseFloat(proj.days / 365) || 0;

            if (proj.freq === 'ANUAL') {
                return proj.initial + (proj.monthly * 12 * year) + (proj.initial * r * year);
            } else {
                let n = 1;
                if (proj.freq === 'SEMESTRAL') n = 2;
                if (proj.freq === 'TRIMESTRAL') n = 4;
                if (proj.freq === 'MENSUAL') n = 12;
                if (proj.freq === 'DIARIO') n = 365;

                const ratePerPeriod = r / n;
                const periods = n * year;
                const contribPerPeriod = (proj.monthly * 12) / n;

                const fvInitial = proj.initial * Math.pow(1 + ratePerPeriod, periods);
                let fvContribs = 0;
                if (Math.abs(ratePerPeriod) > 0.00000001) {
                    fvContribs = contribPerPeriod * (Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod;
                } else {
                    fvContribs = contribPerPeriod * periods;
                }

                return fvInitial + fvContribs;
            }
        };

        window.calculateProjectionInterest = (proj) => {
            const year = parseFloat(proj.days / 365) || 0;
            const totalInvested = proj.initial + (proj.monthly * 12 * year);
            const finalValue = window.calculateProjectionResult(proj);
            return finalValue - totalInvested;
        };


        console.log('[Projection Multi] Enhancement loaded!');
        console.log('[Projection Multi] Functions: addProjection, removeProjection, toggleProjectionExpand');
    };

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
