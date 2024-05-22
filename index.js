const fs = require('fs');

// Имя входного и выходного файлов
const inputFile = 'input.asm';
const outputFile = 'output.txt';

// Определение опкодов и модификаторов
const OPCODES = {
    'MOV': {
        'AX,imm16': 'B8',  // MOV AX, imm16
        'AX,mem': 'A1'     // MOV AX, mem
    },
    'IMUL': 'F6', // IMUL r/m8
    'IDIV': 'F6'  // IDIV r/m8
};

const MODRM = {
    'IMUL': {
        'mem': '25',  // IMUL r/m16
        'r/m8': 'E0'  // IMUL r/m8 with AL
    },
    'IDIV': {
        'mem': '3D',  // IDIV r/m16
        'r/m8': 'F3'  // IDIV r/m8 with BL
    }
};

// Чтение и парсинг входного файла .asm
function parseAsmFile(filePath) {
    const asmContent = fs.readFileSync(filePath, 'utf8');
    const lines = asmContent.split('\n').map(line => line.trim()).filter(line => line);

    const instructions = lines.map(line => {
        const parts = line.split(/\s+/);
        let label = '';
        let command = '';
        let operands = '';
        let length = 0;

        if (parts.length >= 3 && (parts[1] === 'DB' || parts[1] === 'DW')) {
            label = parts[0];
            command = parts[1];
            operands = parts[2];
            length = command === 'DB' ? 1 : 2;
        } else if (parts.length >= 2) {
            command = parts[0];
            operands = parts.slice(1).join(' ');
            length = 3; // Общая длина для команд с регистрами
        } else {
            throw new Error(`Неверный формат строки: ${line}`);
        }

        return { label, command, operands, length };
    });

    return instructions;
}

// Получение адреса по метке
function getAddressByLabel(result, label) {
    const entry = result.find(e => e.label === label);
    return entry ? entry.address : null;
}

// Функция для вычисления адресов и генерации объектного кода
function calculateAddressesAndGenerateCode(instructions) {
    let currentAddress = 0;
    const result = [];

    instructions.forEach(instr => {
        const address = currentAddress.toString(16).padStart(4, '0').toUpperCase();

        if (instr.command === 'DB') {
            const code = parseInt(instr.operands, 10).toString(16).padStart(2, '0').toUpperCase();
            result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            currentAddress += instr.length;
        } else if (instr.command === 'DW') {
            const code = parseInt(instr.operands, 16).toString(16).padStart(4, '0').toUpperCase();
            result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            currentAddress += instr.length;
        } else if (instr.command === 'MOV') {
            const parts = instr.operands.split(',');
            if (parts.length !== 2) {
                throw new Error(`Неверный формат операндов для MOV: ${instr.operands}`);
            }
            const dest = parts[0].trim();
            const src = parts[1].trim();

            if (dest === 'AX' && src.startsWith('value')) {
                const valueAddress = getAddressByLabel(result, src);
                if (!valueAddress) {
                    throw new Error(`Метка не найдена: ${src}`);
                }
                const opcode = OPCODES['MOV']['AX,mem'];
                const code = opcode + valueAddress.slice(2) + valueAddress.slice(0, 2);
                result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            } else if (dest === 'AX' && /^0x[0-9A-Fa-f]+$/.test(src)) {
                const value = parseInt(src, 16).toString(16).padStart(4, '0').toUpperCase();
                const opcode = OPCODES['MOV']['AX,imm16'];
                const code = opcode + value.slice(-4).match(/../g).reverse().join('');
                result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            } else {
                throw new Error(`Неподдерживаемый формат MOV: ${instr.operands}`);
            }
            currentAddress += instr.length;
        } else if (instr.command === 'IMUL') {
            const operand = instr.operands.trim();
            if (operand.startsWith('value')) {
                const valueAddress = getAddressByLabel(result, operand);
                if (!valueAddress) {
                    throw new Error(`Метка не найдена: ${operand}`);
                }
                const opcode = OPCODES['IMUL'];
                const modrm = MODRM['IMUL']['mem'];
                const code = opcode + modrm;
                result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            } else {
                throw new Error(`Неподдерживаемый формат IMUL: ${instr.operands}`);
            }
            currentAddress += instr.length;
        } else if (instr.command === 'IDIV') {
            const operand = instr.operands.trim();
            if (operand.startsWith('value')) {
                const valueAddress = getAddressByLabel(result, operand);
                if (!valueAddress) {
                    throw new Error(`Метка не найдена: ${operand}`);
                }
                const opcode = OPCODES['IDIV'];
                const modrm = MODRM['IDIV']['mem'];
                const code = opcode + modrm;
                result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            } else {
                throw new Error(`Неподдерживаемый формат IDIV: ${instr.operands}`);
            }
            currentAddress += instr.length;
        }
    });

    return result;
}

// Генерация файла с объектным кодом
function generateObjectCodeFile(instructions, outputFile) {
    const calculatedInstructions = calculateAddressesAndGenerateCode(instructions);
    let fileContent = `${"Адрес   "} | ${addSpaces("Код")} | ${addSpaces("Метка")} | ${addSpaces("Команда")} | ${addSpaces("Операнды")}\n`
    fileContent +=calculatedInstructions.map(instr => {
        return `${addSpaces(instr.address)} | ${addSpaces(instr.code)} | ${addSpaces(instr.label || "-")} | ${addSpaces(instr.command)} | ${addSpaces(instr.operands)}`.trim();
    }).join('\n');

    fs.writeFileSync(outputFile, fileContent, 'utf8');
    console.log(`Файл с объектным кодом сгенерирован.`);
}


function addSpaces(str) {
    var totalLength = 12;
    var strLength = str.length;
    var spacesToAdd = totalLength - strLength;

    if (spacesToAdd <= 0) {
        return str; 
    }

    var leftSpaces = Math.floor(spacesToAdd / 2);
    var rightSpaces = spacesToAdd - leftSpaces;

    var result = ' '.repeat(leftSpaces) + str + ' '.repeat(rightSpaces);
    return result;
}

// Чтение и парсинг входного файла .asm
try {
    const instructions = parseAsmFile(inputFile);

    // Генерация файла с объектным кодом
    generateObjectCodeFile(instructions, outputFile);
} catch (error) {
    console.error(`Ошибка: ${error.message}`);
}
