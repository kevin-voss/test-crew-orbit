// C++ Code Snippet
const cppCode = `int main() {
    int x = 5;
    int* ptr = &x;
    int* heap_ptr = new int(10);
    delete heap_ptr;
    return 0;
}`;

// Execution steps definition
const executionSteps = [
    {
        stepNumber: 0,
        lineNumber: 1,
        description: 'Program starts. main() function is called.',
        explanation: 'When the program starts, the main() function is called. A new stack frame is created for the main function, but no variables have been declared yet.',
        stack: [],
        heap: [],
        pointers: []
    },
    {
        stepNumber: 1,
        lineNumber: 2,
        description: 'Variable x is declared and initialized with value 5.',
        explanation: 'The variable "x" of type "int" is declared on the stack. An integer occupies 4 bytes. The variable is initialized to the value 5. Stack memory is allocated at address 0x1000 for this variable.',
        stack: [
            { name: 'x', type: 'int', value: '5', address: '0x1000' }
        ],
        heap: [],
        pointers: []
    },
    {
        stepNumber: 2,
        lineNumber: 3,
        description: 'Pointer ptr is declared and assigned the address of x.',
        explanation: 'A pointer "ptr" is declared on the stack and initialized with the address of variable "x" (0x1000). The pointer itself is stored at address 0x1004. The pointer "points to" the variable x.',
        stack: [
            { name: 'x', type: 'int', value: '5', address: '0x1000' },
            { name: 'ptr', type: 'int*', value: '0x1000', address: '0x1004' }
        ],
        heap: [],
        pointers: [
            { name: 'ptr', pointsTo: 'x', targetAddress: '0x1000', pointerAddress: '0x1004' }
        ]
    },
    {
        stepNumber: 3,
        lineNumber: 4,
        description: 'A new integer is allocated on the heap and heap_ptr points to it.',
        explanation: 'The "new" operator allocates memory on the heap for an integer with value 10. This heap memory is located at address 0x2000. A pointer "heap_ptr" is declared on the stack at address 0x1008 and initialized to point to this heap address (0x2000).',
        stack: [
            { name: 'x', type: 'int', value: '5', address: '0x1000' },
            { name: 'ptr', type: 'int*', value: '0x1000', address: '0x1004' },
            { name: 'heap_ptr', type: 'int*', value: '0x2000', address: '0x1008' }
        ],
        heap: [
            { name: '[heap memory]', type: 'int', value: '10', address: '0x2000' }
        ],
        pointers: [
            { name: 'ptr', pointsTo: 'x', targetAddress: '0x1000', pointerAddress: '0x1004' },
            { name: 'heap_ptr', pointsTo: '[heap memory at 0x2000]', targetAddress: '0x2000', pointerAddress: '0x1008' }
        ]
    },
    {
        stepNumber: 4,
        lineNumber: 5,
        description: 'The heap memory is deallocated using delete.',
        explanation: 'The "delete" operator deallocates the memory that heap_ptr points to. The heap memory at address 0x2000 is freed. After this, heap_ptr becomes a "dangling pointer" - it still contains the address 0x2000, but that memory is no longer valid. The pointer on the stack still exists, but the heap data it pointed to is gone.',
        stack: [
            { name: 'x', type: 'int', value: '5', address: '0x1000' },
            { name: 'ptr', type: 'int*', value: '0x1000', address: '0x1004' },
            { name: 'heap_ptr', type: 'int*', value: '0x2000 (dangling)', address: '0x1008' }
        ],
        heap: [],
        pointers: [
            { name: 'ptr', pointsTo: 'x', targetAddress: '0x1000', pointerAddress: '0x1004' },
            { name: 'heap_ptr', pointsTo: '[DANGLING - freed memory]', targetAddress: '0x2000', pointerAddress: '0x1008' }
        ]
    },
    {
        stepNumber: 5,
        lineNumber: 6,
        description: 'Function returns 0. Stack is unwound.',
        explanation: 'The main() function returns 0. The stack frame for main() is destroyed, and all local variables (x, ptr, heap_ptr) are deallocated. The program terminates.',
        stack: [],
        heap: [],
        pointers: []
    }
];

// DOM Elements
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const stepCounter = document.getElementById('stepCounter');
const currentLine = document.getElementById('currentLine');
const explanation = document.getElementById('explanation');
const stackDisplay = document.getElementById('stackDisplay');
const heapDisplay = document.getElementById('heapDisplay');
const pointersDisplay = document.getElementById('pointersDisplay');
const codeDisplay = document.getElementById('codeDisplay');

// State
let currentStepIndex = 0;

// Initialize
function init() {
    displayCode();
    updateDisplay();
    setupEventListeners();
}

function displayCode() {
    const lines = cppCode.split('\n');
    const html = lines.map((line, index) => {
        return `<div class="code-line" data-line="${index + 1}">${escapeHtml(line)}</div>`;
    }).join('');
    codeDisplay.innerHTML = html;
}

function updateDisplay() {
    const step = executionSteps[currentStepIndex];

    // Update step counter
    stepCounter.textContent = `Step ${step.stepNumber}/${executionSteps.length - 1}`;

    // Update current line
    const codeLines = document.querySelectorAll('.code-line');
    codeLines.forEach(line => {
        line.classList.remove('current', 'executed');
        const lineNum = parseInt(line.getAttribute('data-line'));
        if (lineNum === step.lineNumber) {
            line.classList.add('current');
        } else if (lineNum < step.lineNumber) {
            line.classList.add('executed');
        }
    });

    // Update current line text
    currentLine.textContent = `Line ${step.lineNumber}: ${cppCode.split('\n')[step.lineNumber - 1].trim()}`;

    // Update explanation
    explanation.textContent = step.explanation;

    // Update stack display
    displayStack(step.stack);

    // Update heap display
    displayHeap(step.heap);

    // Update pointers display
    displayPointers(step.pointers);

    // Update button states
    prevBtn.disabled = currentStepIndex === 0;
    nextBtn.disabled = currentStepIndex === executionSteps.length - 1;
}

function displayStack(stackItems) {
    if (stackItems.length === 0) {
        stackDisplay.innerHTML = '<div class="empty-state">No variables on stack</div>';
        return;
    }

    const html = stackItems.map(item => `
        <div class="memory-item">
            <div>
                <div class="memory-var-name">${escapeHtml(item.name)}</div>
                <div class="memory-var-address">Address: ${item.address}</div>
            </div>
            <div>
                <div class="memory-var-value">${escapeHtml(item.value)}</div>
                <div class="memory-var-address">${item.type}</div>
            </div>
        </div>
    `).join('');

    stackDisplay.innerHTML = html;
}

function displayHeap(heapItems) {
    if (heapItems.length === 0) {
        heapDisplay.innerHTML = '<div class="empty-state">No variables on heap</div>';
        return;
    }

    const html = heapItems.map(item => `
        <div class="memory-item heap">
            <div>
                <div class="memory-var-name">${escapeHtml(item.name)}</div>
                <div class="memory-var-address">Address: ${item.address}</div>
            </div>
            <div>
                <div class="memory-var-value">${escapeHtml(item.value)}</div>
                <div class="memory-var-address">${item.type}</div>
            </div>
        </div>
    `).join('');

    heapDisplay.innerHTML = html;
}

function displayPointers(pointerItems) {
    if (pointerItems.length === 0) {
        pointersDisplay.innerHTML = '<div class="empty-state">No pointers in current step</div>';
        return;
    }

    const html = pointerItems.map(item => `
        <div class="pointer-item">
            <div>
                <span class="pointer-name">${escapeHtml(item.name)}</span>
                <span style="margin: 0 10px;">→</span>
                <span class="pointer-target">${escapeHtml(item.pointsTo)}</span>
            </div>
            <div class="pointer-address">
                Pointer at ${item.pointerAddress} contains address ${item.targetAddress}
            </div>
        </div>
    `).join('');

    pointersDisplay.innerHTML = html;
}

function nextStep() {
    if (currentStepIndex < executionSteps.length - 1) {
        currentStepIndex++;
        updateDisplay();
    }
}

function prevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        updateDisplay();
    }
}

function setupEventListeners() {
    nextBtn.addEventListener('click', nextStep);
    prevBtn.addEventListener('click', prevStep);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextStep();
        if (e.key === 'ArrowLeft') prevStep();
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Start the app
init();
