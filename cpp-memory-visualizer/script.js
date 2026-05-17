// C++ Code to visualize
const cppCode = `int main() {
    int x = 5;              // Line 2
    int* ptr = &x;          // Line 3
    int* ptrHeap = new int(10);  // Line 4
    *ptr = 20;              // Line 5
    delete ptrHeap;         // Line 6
    return 0;               // Line 7
}`;

// Execution steps with memory state
const executionSteps = [
    {
        step: 1,
        highlightLine: 1,
        title: "Function starts",
        stackState: {
            main: []
        },
        heapState: [],
        pointers: [],
        explanation: "The program has just started. The <strong>main()</strong> function is being executed. The stack is empty for now as no local variables have been created yet.",
    },
    {
        step: 2,
        highlightLine: 2,
        title: "Variable x declaration",
        stackState: {
            main: [
                { name: "x", value: "5", address: "0x1000" }
            ]
        },
        heapState: [],
        pointers: [],
        explanation: "The variable <em>x</em> is declared and initialized with value 5. It is stored on the <strong>stack</strong> at memory address 0x1000. The stack grows as we add variables.",
    },
    {
        step: 3,
        highlightLine: 3,
        title: "Pointer creation",
        stackState: {
            main: [
                { name: "x", value: "5", address: "0x1000" },
                { name: "ptr", value: "0x1000", address: "0x1004", isPointer: true }
            ]
        },
        heapState: [],
        pointers: [
            { name: "ptr", pointsTo: "x", address: "0x1004", value: "0x1000" }
        ],
        explanation: "A <strong>pointer variable ptr</strong> is created on the stack at address 0x1004. The pointer stores the address of <em>x</em> (0x1000). We use the <em>address-of operator (&)</em> to get x's address. The pointer <strong>points to</strong> the variable x.",
    },
    {
        step: 4,
        highlightLine: 4,
        title: "Dynamic allocation on heap",
        stackState: {
            main: [
                { name: "x", value: "5", address: "0x1000" },
                { name: "ptr", value: "0x1000", address: "0x1004", isPointer: true },
                { name: "ptrHeap", value: "0x2000", address: "0x1008", isPointer: true }
            ]
        },
        heapState: [
            { value: "10", address: "0x2000" }
        ],
        pointers: [
            { name: "ptr", pointsTo: "x", address: "0x1004", value: "0x1000" },
            { name: "ptrHeap", pointsTo: "heap memory", address: "0x1008", value: "0x2000" }
        ],
        explanation: "The <strong>new</strong> keyword allocates memory on the <em>heap</em> for an integer with value 10. The heap is a larger memory region used for dynamic allocation. A pointer <em>ptrHeap</em> is created on the stack to store the heap address (0x2000). Notice: the pointer is on the stack, but what it points to is on the heap.",
    },
    {
        step: 5,
        highlightLine: 5,
        title: "Dereferencing pointer",
        stackState: {
            main: [
                { name: "x", value: "20", address: "0x1000" },
                { name: "ptr", value: "0x1000", address: "0x1004", isPointer: true },
                { name: "ptrHeap", value: "0x2000", address: "0x1008", isPointer: true }
            ]
        },
        heapState: [
            { value: "10", address: "0x2000" }
        ],
        pointers: [
            { name: "ptr", pointsTo: "x", address: "0x1004", value: "0x1000" },
            { name: "ptrHeap", pointsTo: "heap memory", address: "0x1008", value: "0x2000" }
        ],
        explanation: "Using the <strong>dereference operator (*)</strong>, we access the value that ptr points to (which is x). We change x's value from 5 to 20. The line <em>*ptr = 20</em> means 'set the value at the address that ptr points to, to 20'.",
    },
    {
        step: 6,
        highlightLine: 6,
        title: "Memory deallocation",
        stackState: {
            main: [
                { name: "x", value: "20", address: "0x1000" },
                { name: "ptr", value: "0x1000", address: "0x1004", isPointer: true },
                { name: "ptrHeap", value: "0x2000", address: "0x1008", isPointer: true }
            ]
        },
        heapState: [],
        pointers: [
            { name: "ptr", pointsTo: "x", address: "0x1004", value: "0x1000" },
            { name: "ptrHeap", pointsTo: "invalid (freed)", address: "0x1008", value: "0x2000 (dangling)" }
        ],
        explanation: "The <strong>delete</strong> keyword deallocates the memory we allocated on the heap. The heap memory at 0x2000 is freed and returned to the system. However, ptrHeap still contains 0x2000 - it's now a <em>dangling pointer</em>. Using it would cause undefined behavior. Best practice: set it to nullptr after deleting.",
    },
    {
        step: 7,
        highlightLine: 7,
        title: "Function ends",
        stackState: {
            main: []
        },
        heapState: [],
        pointers: [],
        explanation: "The function returns 0. All stack variables (x, ptr, ptrHeap) are automatically destroyed. The memory they occupied is reclaimed. Always remember: stack variables are automatic, heap memory must be manually deleted to avoid memory leaks.",
    }
];

let currentStepIndex = 0;

// DOM elements
const codeDisplay = document.getElementById('codeDisplay');
const stackDisplay = document.getElementById('stackDisplay');
const heapDisplay = document.getElementById('heapDisplay');
const pointerDisplay = document.getElementById('pointerDisplay');
const explanationDisplay = document.getElementById('explanationDisplay');
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const currentStepSpan = document.getElementById('currentStep');
const totalStepsSpan = document.getElementById('totalSteps');

// Initialize
function init() {
    codeDisplay.textContent = cppCode;
    totalStepsSpan.textContent = executionSteps.length;
    renderStep();
}

// Render current step
function renderStep() {
    const step = executionSteps[currentStepIndex];

    // Update step indicator
    currentStepSpan.textContent = step.step;

    // Update button states
    backBtn.disabled = currentStepIndex === 0;
    nextBtn.disabled = currentStepIndex === executionSteps.length - 1;

    // Render stack
    renderStackMemory(step.stackState);

    // Render heap
    renderHeapMemory(step.heapState);

    // Render pointers
    renderPointerRelationships(step.pointers);

    // Render explanation
    renderExplanation(step.explanation);

    // Highlight current line in code
    highlightCodeLine(step.highlightLine);
}

// Render stack memory
function renderStackMemory(stackState) {
    let html = '';

    if (Object.keys(stackState).length === 0 || stackState.main.length === 0) {
        html = '<div class="empty-state">Stack is empty</div>';
    } else {
        for (const [scope, variables] of Object.entries(stackState)) {
            if (variables.length > 0) {
                html += `<div style="margin-bottom: 15px;"><strong>${scope}() scope:</strong></div>`;
                for (const variable of variables) {
                    const pointerIndicator = variable.isPointer ? ' (pointer)' : '';
                    html += `
                        <div class="memory-item">
                            <div><span class="variable-name">${variable.name}</span>${pointerIndicator}</div>
                            <div>Value: <span class="variable-value">${variable.value}</span></div>
                            <div>Address: <span class="address">${variable.address}</span></div>
                        </div>
                    `;
                }
            }
        }
    }

    stackDisplay.innerHTML = html;
}

// Render heap memory
function renderHeapMemory(heapState) {
    let html = '';

    if (heapState.length === 0) {
        html = '<div class="empty-state">Heap is empty</div>';
    } else {
        for (const allocation of heapState) {
            html += `
                <div class="memory-item">
                    <div>Dynamically allocated value</div>
                    <div>Value: <span class="variable-value">${allocation.value}</span></div>
                    <div>Address: <span class="address">${allocation.address}</span></div>
                </div>
            `;
        }
    }

    heapDisplay.innerHTML = html;
}

// Render pointer relationships
function renderPointerRelationships(pointers) {
    let html = '';

    if (pointers.length === 0) {
        html = '<div class="empty-state">No pointers yet</div>';
    } else {
        for (const pointer of pointers) {
            html += `
                <div class="pointer-info">
                    <div class="pointer-name">Pointer: ${pointer.name}</div>
                    <div class="pointer-details">
                        <div class="pointer-details-item">📍 <strong>Stored at:</strong> ${pointer.address}</div>
                        <div class="pointer-details-item">➡️ <strong>Points to:</strong> ${pointer.pointsTo}</div>
                        <div class="pointer-details-item">💾 <strong>Contains address:</strong> ${pointer.value}</div>
                    </div>
                </div>
            `;
        }
    }

    pointerDisplay.innerHTML = html;
}

// Render explanation
function renderExplanation(explanation) {
    explanationDisplay.innerHTML = `<p>${explanation}</p>`;
}

// Highlight code line
function highlightCodeLine(lineNumber) {
    const lines = codeDisplay.textContent.split('\n');
    let highlighted = '';

    for (let i = 0; i < lines.length; i++) {
        if (i === lineNumber) {
            highlighted += `<span style="background-color: #ffffcc; padding: 2px 4px; border-left: 3px solid #f39c12;">→ ${lines[i]}</span>\n`;
        } else {
            highlighted += lines[i] + '\n';
        }
    }

    codeDisplay.innerHTML = highlighted;
}

// Navigation
nextBtn.addEventListener('click', () => {
    if (currentStepIndex < executionSteps.length - 1) {
        currentStepIndex++;
        renderStep();
    }
});

backBtn.addEventListener('click', () => {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        renderStep();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
        nextBtn.click();
    } else if (event.key === 'ArrowLeft') {
        backBtn.click();
    }
});

// Start the app
init();
