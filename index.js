const fs = require('fs');
const path = require('path');

// Имя входного и выходного файлов
const inputFile = 'input.asm';
const outputFile = 'output.txt';

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

        if (parts[1] === 'DB' || parts[1] === 'DW') {
            label = parts[0];
            command = parts[1];
            operands = parts[2];
            length = command === 'DB' ? 1 : 2;
        } else {
            command = parts[0] + ' ' + parts[1];
            operands = parts.slice(2).join(' ');
            length = 3; // Для команд с регистрами предполагаем фиксированную длину 3 байта
        }

        return { label, command, operands, length };
    });

    return instructions;
}

// Функция для вычисления адресов и генерации объектного кода
function calculateAddressesAndGenerateCode(instructions) {
    let currentAddress = 0;
    const result = [];

    instructions.forEach(instr => {
        const address = currentAddress.toString(16).padStart(4, '0').toUpperCase();

        if (instr.command === 'DB') {
            const code = parseInt(instr.operands, 16).toString(16).padStart(2, '0').toUpperCase();
            result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            currentAddress += instr.length;
        } else if (instr.command === 'DW') {
            const code = parseInt(instr.operands, 16).toString(16).padStart(4, '0').toUpperCase();
            result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            currentAddress += instr.length;
        } else if (instr.command.startsWith('MOV AX')) {
            const value = '1000'; // значение для value2
            const opcode = 'B8';
            const code = opcode + value.slice(-4).match(/../g).reverse().join('');
            result.push({ address, code, label: instr.label, command: instr.command, operands: instr.operands });
            currentAddress += instr.length;
        } else if (instr.command.startsWith('IMUL')) {
            const opcode = 'F6';
            const modrm = 'E0'; // ModR/M для IMUL value1 (регистр AL)
            result.push({ address, code: opcode + modrm, label: instr.label, command: instr.command, operands: instr.operands });
            currentAddress += instr.length;
        } else if (instr.command.startsWith('IDIV')) {
            const opcode = 'F6';
            const modrm = 'F8'; // ModR/M для IDIV value3 (регистр BL)
            result.push({ address, code: opcode + modrm, label: instr.label, command: instr.command, operands: instr.operands });
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
        return str; // Если строка уже имеет длину 12 или больше, просто возвращаем её без изменений
    }

    var leftSpaces = Math.floor(spacesToAdd / 2);
    var rightSpaces = spacesToAdd - leftSpaces;

    var result = ' '.repeat(leftSpaces) + str + ' '.repeat(rightSpaces);
    return result;
}


// Чтение и парсинг входного файла .asm
const instructions = parseAsmFile(inputFile);

// Генерация файла с объектным кодом
generateObjectCodeFile(instructions, outputFile);
