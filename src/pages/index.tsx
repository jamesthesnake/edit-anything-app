import Head from "next/head";
import NextImage from "next/image";
import { useState } from "react";

import Card from "@/components/Card";
import ImageSpot, { ImageSpotPosition } from "@/components/ImageSpot";
import Steps, { StepName } from "@/components/Steps";
import EmptyMessage from "@/components/EmptyMessage";
import ImageSelector, { ImageFile } from "@/components/ImageSelector";

const Home = () => {
  const [step, setStep] = useState<StepName>(StepName.ChooseImage);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [position, setPosition] = useState<ImageSpotPosition | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [masks, setMasks] = useState<string[]>([]);
  const [selectedMask, setSelectedMask] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(false);

  const reset = () => {
    setStep(StepName.ChooseImage);
    setSelectedImage(null);
    setPosition(null);
    setMasks([]);
    setPrompt("");
    setImageUrls([]);
    setLoading(false);
  };

  const handleImageSelected = (image: ImageFile) => {
    setSelectedImage(image);
    setStep(StepName.SetMaskPoint);
  };

  const handleImageClick = (position: ImageSpotPosition) => {
    setPosition(position);
    setStep(StepName.GenerateMask);
  };

  const generateMasks = async () => {
    setLoading(true);
    try {
      if (!selectedImage || !position) {
        // TODO error message?
        return;
      }
      const response = await fetch("/api/masks", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          image: selectedImage.data,
          extension: "." + selectedImage.filename.split(".").pop(),
          x: position.x,
          y: position.y,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setMasks(data.files);
      setImageId(data.image_id);
      setStep(StepName.ChooseMask);
    } catch (e) {
      // TODO set error state
    } finally {
      setLoading(false);
    }
  };

  const handleMaskSelected = (mask: string) => {
    return () => {
      setSelectedMask(mask);
      setStep(StepName.DefinePrompt);
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (!selectedImage || !position || !selectedMask) {
        // TODO set error state / message
        return;
      }
      // extract the maskId from the mask url using the with_mask_(\d+) pattern
      const maskId = selectedMask.match(/with_mask_(\d+)/)?.[1];
      if (!maskId) {
        // TODO set error state / message
        return;
      }
      const response = await fetch("/api/edit", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          image_id: imageId,
          extension: "." + selectedImage.filename.split(".").pop(),
          mask_id: maskId,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      setImageUrls(data.files);
      setStep(StepName.Generate);
    } catch (e) {
      // TODO set error state
    } finally {
      setLoading(false);
    }
  };

  const hasPrompt = prompt && prompt.trim().length > 0;

  return (
    <main className="min-h-screen py-16">
      <Head>
        <title>Edit Anything | fal-serverless</title>
      </Head>
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        <div className="md:col-span-3">
          <Card>
            <Steps currentStep={step} />
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card title="Source image">
            {!selectedImage && (
              <ImageSelector
                onImageSelect={handleImageSelected}
                disabled={isLoading}
              />
            )}
            {selectedImage && (
              <>
                <div className="flex justify-between my-4">
                  <span className="font-light mb-0 inline-block opacity-70">
                    <strong>Hint:</strong> click on the image to set the mask
                    reference point
                  </span>
                  <button
                    className="btn btn-outline btn-secondary self-end"
                    onClick={reset}
                    disabled={isLoading}
                  >
                    Reset
                  </button>
                </div>
                <ImageSpot
                  imageUrl={selectedImage.data}
                  height={selectedImage.size.height}
                  width={selectedImage.size.width}
                  onClick={handleImageClick}
                />
              </>
            )}
          </Card>
        </div>
        <div className="md:col-span-1">
          <Card title="Masks" classNames="min-h-full">
            {masks.length === 0 && (
              <div className="mt-12">
                <EmptyMessage message="No masks generated yet" />
                <div className="flex flex-col items-center">
                  <button
                    className="btn btn-primary"
                    disabled={isLoading || !selectedImage || !position}
                    onClick={generateMasks}
                  >
                    Generate masks
                  </button>
                </div>
              </div>
            )}
            {masks.length > 0 && (
              <div className="grid grid-cols-1 space-y-2">
                {masks.map((mask, index) => (
                  <div
                    key={index}
                    className={`border-2 p-2 dark:border-base-100 ${
                      selectedMask === mask ? "border-secondary" : ""
                    }`}
                    onClick={handleMaskSelected(mask)}
                  >
                    <NextImage
                      src={mask}
                      alt={`Mask ${index + 1}`}
                      width={0}
                      height={0}
                      sizes="100vw"
                      style={{ width: "100%", height: "auto" }}
                      className="my-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
      <div className="container mx-auto pt-8 w-full">
        <Card>
          <div className="flex space-x-6">
            <div className="form-control w-3/5 max-w-full">
              <label className="input-group">
                <span>
                  <code className="opacity-40">/imagine</code>
                </span>
                <input
                  id="prompt_input"
                  type="text"
                  name="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="something creative, like 'a bus on the moon'"
                  className="input placeholder-gray-500 w-full"
                  disabled={isLoading}
                />
              </label>
            </div>
            <button
              className="btn btn-primary"
              disabled={isLoading || !selectedMask || !hasPrompt}
              onClick={handleGenerate}
            >
              Generate
            </button>
          </div>
          {imageUrls.length === 0 && (
            <div className="my-12">
              <EmptyMessage message="Nothing to see just yet" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {imageUrls.map((url, index) => (
              <NextImage
                key={index}
                src={url}
                alt={`Generated Image ${index + 1}`}
                width={0}
                height={0}
                sizes="100vw"
                style={{ width: "100%", height: "auto" }}
                className="my-0"
              />
            ))}
          </div>
        </Card>
      </div>
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="alert max-w-md shadow-lg p-12">
            <div className="flex-col items-center pt-6 w-full">
              <progress className="progress progress-primary w-max-[60%]"></progress>
              <p className="my-4">Hold on tight, we&apos;re working on it!</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
