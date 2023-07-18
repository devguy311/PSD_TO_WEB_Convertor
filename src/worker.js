// @webtoon/psd
// Copyright 2021-present NAVER WEBTOON
// MIT License

import Psd from "@webtoon/psd";
import {createMessage, validateMessage} from "./messaging";

self.addEventListener("message", async ({data}) => {
  const {type, timestamp, value} = data;

  validateMessage(data);

  console.log(
    `It took %d ms to send this message (main → worker, type: %o)`,
    Date.now() - timestamp,
    type
  );

  if (type === "ParseData") {
    console.time("Parse PSD file");
    const psd = Psd.parse(value);
    console.timeEnd("Parse PSD file");
    
    const { width, height } = psd.parsingResult.fileHeader;
    const layers = psd.layers.slice().reverse().entries();

    for (const [index, layer] of layers) {
      console.time(`Compositing layer ${index}`);
      const pixelData = await layer.composite(true, true);
      console.timeEnd(`Compositing layer ${index}`);

      const layerProperties = layer.layerFrame.layerProperties;
      const opacity = layerProperties?.opacity;
      const text = layerProperties?.text ? layerProperties?.text : undefined;
      const hidden = layerProperties?.hidden;
      const fontStyle = layerProperties?.textProperties?.EngineDict.StyleRun.RunArray[0].StyleSheet.StyleSheetData;
      const fontFamily = layerProperties?.textProperties?.DocumentResources.FontSet[0].Name;
      const isCenter = layerProperties?.textProperties?.EngineDict.ParagraphRun.RunArray[0].ParagraphSheet.Properties.Justification === 2 ? true : false;
      const fontTransform = (layerProperties?.additionalLayerProperties?.TySh?.transformXX + layerProperties.additionalLayerProperties?.TySh?.transformYY) / 2;
      const fontCaps = layerProperties?.textProperties?.EngineDict?.StyleRun?.RunArray[0]?.StyleSheet?.StyleSheetData?.FontCaps;

      (self).postMessage(
        createMessage("Layer", {
          pixelData: pixelData,
          layerName: layer.name,
          left: layer.left,
          top: layer.top,
          width: layer.width,
          height: layer.height,
          opacity: opacity,
          text: text,
          hidden: hidden,
          fontStyle: fontStyle,
          fontFamily: fontFamily,
          isCenter: isCenter,
          fontTransform: fontTransform,
          fontCaps: fontCaps,
          psdWidth : width,
          psdHeight: height
        }),
        [pixelData.buffer]
      );
    }

    (self).postMessage(
        createMessage("EndParsing", {})
    );
  } else {
    console.error(`Worker received a message that it cannot handle: %o`, data);
  }
});