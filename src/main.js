// @webtoon/psd
// Copyright 2021-present NAVER WEBTOON
// MIT License

import * as createjs from 'createjs-module';
import * as dat from 'dat.gui';
import WebFont from 'webfontloader';

import { stage, viewport } from './scene';
import { createImageData } from 'canvas';
import { createMessage, validateMessage } from "./messaging";

export const gui = new dat.GUI({ autoPlace: true });
const layerList = [];
const ids = [];
const frames = [];
const instances = [];
const fontList = [];

const generateCanvas = async ({ pixelData, psdWidth, psdHeight, layerName, left, top, width, height, opacity, text, hidden, fontStyle, fontFamily, isCenter, fontTransform, fontCaps }, background) => {
    const _center = {
        x: (left * 2 + width) / 2,
        y: (top * 2 + height) / 2,
    }
    const _width = width;
    const _height = height;
    const frame = {
        id: generateId('F'),
        type: text === undefined ? 'image' : 'text',
        name: layerName,
        x: Math.floor(_center.x / psdWidth * 100),
        y: Math.floor(_center.y / psdHeight * 100),
        w: _width,
        h: _height,
        r: 0,
        flipH: false,
        flipV: false,
    }

    const instance = {
        id: generateId('I'),
        name: layerName,
        x: 50,
        y: 50,
        w: _width,
        h: _height,
        r: 0,
        visible: !(hidden),
        opacity: opacity / 255,
    }
    if (text) {
        instance.text = text;
        instance.fontFamily = fontFamily;
        instance.fontSize = fontStyle.FontSize;
        instance.fontBold = fontStyle.FauxBold;
        instance.fontItalic = fontStyle.FauxItalic;
        instance.fontFill = fontStyle.FillColor;
    }
    frames.push(frame);
    instances.push(instance);

    const canvasEl = document.createElement('canvas');
    const context = canvasEl.getContext('2d');

    // const { width, height, top, left } = layer.layerFrame.layerProperties;

    canvasEl.width = _width;
    canvasEl.height = _height;

    const imageData = createImageData(pixelData, _width, _height);
    context.putImageData(imageData, 0, 0);

    const canvas = new createjs.Bitmap(canvasEl);
    canvas.x = left;
    canvas.y = top;

    const folder = gui.addFolder(layerName + '-' + frame.id);
    const settings = {
        x: frame.x,
        y: frame.y,
    }
    if (!text) {
        folder.add(settings, "x").onChange((value) => {
            canvas.x = psdWidth / 100 * value - (frame.w / 2) * canvas.scaleX;
            stage.update();
        });
        folder.add(settings, "y").onChange((value) => {
            canvas.y = psdHeight / 100 * value - (frame.h / 2) * canvas.scaleY;
            stage.update();
        });
        folder.add(canvas, 'scaleX').listen().onChange(() => stage.update());
        folder.add(canvas, 'scaleY').listen().onChange(() => stage.update());
    }
    if (text) {

        const fontFm = fontFamily.split('-');

        let color = null;
        // conver CMYK to Hex

        if (fontStyle?.FillColor?.Values?.length === 5)
            color = cmykToRgb(fontStyle.FillColor.Values);
        else if (fontStyle?.FillColor?.Values?.length === 4)
            color = rgbToHex(fontStyle.FillColor.Values);

        if (color === null) color = '#000000';

        let fontSize;
        if (!fontStyle.FontSize)
            fontSize = Math.round(12 * fontTransform * 300 / 72);
        else fontSize = Math.round(fontStyle.FontSize * fontTransform);

        // saving font info to json
        const fontInfo = {
            fontfamily: fontFm[0],
            fontsize: fontSize + "px",
            color: color,
            alignCenter: false,
            text: text
        }
        if (fontCaps && fontCaps > 0)
            fontInfo.text = fontInfo.text.toUpperCase();
            
        // create text object
        const textObj = new createjs.Text(fontInfo.text, fontInfo.fontsize + ` ${fontInfo.fontfamily}`, color);

        textObj.x = alignCenter(isCenter, psdWidth, textObj.getMeasuredWidth(), canvas.x);
        textObj.y = canvas.y;
        textObj.mask = background;
        viewport.addChild(textObj);

        folder.add(textObj, "x").listen().onChange(() => stage.update());
        folder.add(textObj, "y").listen().onChange(() => stage.update());
        folder.add(textObj, "scaleX").listen().onChange(() => {
            textObj.x = alignCenter(isCenter, psdWidth, textObj.getMeasuredWidth(), canvas.x);
            stage.update()
        });
        folder.add(textObj, "scaleY").listen().onChange(() => stage.update());
        folder.add(fontInfo, "text").listen().onChange(() => {
            textObj.text = fontInfo.text;
            textObj.x = alignCenter(isCenter, psdWidth, textObj.getMeasuredWidth(), canvas.x);
            stage.update();
        });
        folder.add(textObj, 'color').listen().onChange(() => stage.update());
        folder.add(fontInfo, 'fontsize').listen().onChange(() => {
            const fontinfo = textObj.font.split(' ');
            if (fontinfo.length > 1)
                textObj.font = `${fontInfo?.fontsize} ${fontinfo[1]}`;
            textObj.x = alignCenter(isCenter, psdWidth, textObj.getMeasuredWidth(), canvas.x);
            stage.update();
        });
        folder.add(fontInfo, 'fontfamily').listen().onChange(() => {
            // load fonts from google
            if (!fontList.includes(fontInfo.fontfamily)) {
                WebFont.load({
                    google: {
                        families: [fontInfo.fontfamily] // Replace with the desired font names
                    },
                    active: () => {
                        textObj.font = `${fontInfo?.fontsize} ${fontInfo.fontfamily}`;
                    },
                    inactive: () => {
                        textObj.font = `${fontInfo?.fontsize} ${fontInfo.fontfamily}`;
                    }
                });
            }
            textObj.x = alignCenter(isCenter, psdWidth, textObj.getMeasuredWidth(), canvas.x);
            stage.update();
        });
        stage.update();

    }

    if (!text) {
        canvas.mask = background;
        layerList.push(canvas);
        viewport.addChild(canvas);
    }
    stage.update();
}

const readFileAsArrayBuffer = (file) => {
    if (file.arrayBuffer) {
        return file.arrayBuffer();
    } else {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        return new Promise < ArrayBuffer > ((resolve) => {
            reader.addEventListener("load", (event) => {
                if (event.target) {
                    resolve(event.target.result);
                } else {
                    throw new Error("Loaded file but event.target is null");
                }
            });
        });
    }
};

const workerCallback = async ({ data }) => {
    const { type, timestamp, value } = data;

    validateMessage(data);

    console.log(
        `It took %d ms to send this message (worker → main, type: %o)`,
        Date.now() - timestamp,
        type
    );

    if (type === "Layer") {
        console.log(value);
        const { pixelData, psdWidth, psdHeight, layerName, left, top, width, height, opacity, text, hidden, fontStyle, fontFamily, isCenter, fontTransform, fontCaps } = value;
        const backgroundLayer = new createjs.Shape();
        backgroundLayer.graphics.beginFill("DeepSkyBlue").drawRect(0, 0, psdWidth, psdHeight);
        backgroundLayer.x = 0;
        backgroundLayer.y = 0;

        await generateCanvas({ pixelData, psdWidth, psdHeight, layerName, left, top, width, height, opacity, text, hidden, fontStyle, fontFamily, isCenter, fontTransform, fontCaps }, backgroundLayer);
        stage.update();
    }

    if (type === 'EndParsing'){
        setTimeout(() => {
            viewport.setTransform(viewport.x + 0.1, viewport.y + 0.1);
            stage.update();
        }, 100);
    }

    stage.update();
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Script loaded");
    document.fonts.ready.then(() => {

        console.log("fonts are fully loaded!");

        const inputEl = document.querySelector(
            'input[type="file"]'
        );

        // eslint-disable-next-line compat/compat
        const worker = new Worker(new URL("./worker.js", import.meta.url), {
            type: "module",
        });

        worker.addEventListener("message", (e) =>
            workerCallback(e)
        );

        inputEl.addEventListener("change", () => {
            const file = (inputEl.files)[0];
            if (!file) return;

            clearStage();

            readFileAsArrayBuffer(file).then((buffer) => {
                worker.postMessage(createMessage("ParseData", buffer));
            });

            // Reset the input so we can reload the same file over and over
            inputEl.value = "";
        });
    })
});

// Remove all folders from dat.gui
const removeAllFolders = () => {
    // Get all folders
    const guiFolders = gui.__folders;

    // Iterate over folders and remove them
    for (const folderName in guiFolders) {
        gui.removeFolder(guiFolders[folderName]);
    }
};


const clearStage = () => {
    ids.length = 0;
    frames.length = 0;
    instances.length = 0;
    layerList.length = 0;
    viewport.removeAllChildren();
    removeAllFolders();
}

const generateId = (prefix) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = prefix + '_';
    const charactersLength = characters.length;
    while (true) {
        for (let i = 0; i < 5; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        if (ids.includes(result))
            result = prefix + '_';
        else
            break;
    }
    return result;
}

function alignCenter(isCenter, psd_width, width, canvasX) {
    if (isCenter)
        return (psd_width - width) / 2;
    return canvasX;
}

function cmykToRgb([, c, m, y, k]) {
    // Convert CMYK values to fractions

    // Calculate RGB values
    const R = Math.round(255 * (1 - c) * (1 - k));
    const G = Math.round(255 * (1 - m) * (1 - k));
    const B = Math.round(255 * (1 - y) * (1 - k));

    const value = rgbToHex([1, R, G, B]);
    return value;
}

// Function to convert RGB to hexadecimal
function rgbToHex([a, r, g, b]) {
    const toHex = (color) => {
        const hex = color.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    const hexR = toHex(r);
    const hexG = toHex(g);
    const hexB = toHex(b);

    return '#' + hexR + hexG + hexB;
}