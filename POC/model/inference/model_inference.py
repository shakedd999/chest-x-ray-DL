from typing import Dict, List, TypedDict

import tensorflow as tf
import numpy as np
from PIL import Image
import gdown
import os

from POC.model.inference.trained_model_parameters import *


class PredictionResult(TypedDict):
    probabilities: Dict[str, float]
    predictions: List[str]


model = None
pos_weights_tf = tf.constant(POSITIVE_WEIGHTS_SQRT, dtype=tf.float32)


def weighted_bce(y_true, y_pred):
    y_pred = tf.clip_by_value(y_pred, EPSILON, 1.0 - EPSILON)
    loss = -(pos_weights_tf * y_true * tf.math.log(y_pred) + (1.0 - y_true) * tf.math.log(1.0 - y_pred))
    return tf.reduce_mean(loss)


def download_and_load_the_model():
    global model

    url = f'https://drive.google.com/uc?id={MODEL_ID_IN_DRIVE}'
    if not os.path.exists(MODEL_FILE_NAME):
        gdown.download(url, MODEL_FILE_NAME, quiet=False)

    model = tf.keras.models.load_model(
        MODEL_FILE_NAME,
        custom_objects={'weighted_bce': weighted_bce}
    )


def preprocess_xray(image: Image.Image) -> np.ndarray:
    new_image = image.convert("RGB").resize((224, 224))
    img_array = np.array(new_image)
    return np.expand_dims(img_array, axis=0)


def get_prediction(image: Image.Image) -> PredictionResult:
    """
    Predicts the chest disease of an in-memory image if exists.
    :param image: A PIL Image object containing the chest X-ray to classify.
    :return: A dict with two keys:
             - 'probabilities': mapping of every class name ('Infiltration', 'Effusion', 'Atelectasis')
               to its raw model probability.
             - 'predictions': list of class names whose probability exceeded the per-class threshold,
               or ['Normal'] if none did.
    """
    if model is None:
        raise RuntimeError("Model is not loaded. Call download_and_load_the_model() first.")

    processed_img = preprocess_xray(image)

    model_numerical_predictions = model.predict(processed_img)[0] # return the model predictions

    probabilities = {
        class_name: float(model_numerical_predictions[index])
        for index, class_name in CLASSES.items()
    }

    model_thresholds = np.array(THRESHOLDS_FOR_PREDICTIONS)
    result = list((model_numerical_predictions - model_thresholds > 0).astype(int))

    model_predictions = [class_name for index, class_name in CLASSES.items() if result[index] == 1]
    if not model_predictions:
        model_predictions = ['Normal']

    return {"probabilities": probabilities, "predictions": model_predictions}


if __name__ == "__main__":
    download_and_load_the_model()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.normpath(os.path.join(current_dir, "..", "..", "test_xray_images"))

    test_cases = [
        ("00000038_006-Atelectasis+Infiltration.png", ['Atelectasis', 'Infiltration']),
        ("00000059_000-Normal.png", ['Normal']),
        ("00000099_012-Effusion.png", ['Effusion']),
    ]

    for file_name, actual_labels in test_cases:
        image_path = os.path.join(images_dir, file_name)
        if not os.path.exists(image_path):
            print(f"Image '{file_name}' not found at {image_path}")
            continue

        with Image.open(image_path) as img:
            result = get_prediction(img)
        print(
            f"Image Name: '{file_name}'  |  "
            f"Probabilities: {result['probabilities']}  |  "
            f"Model Predictions: {result['predictions']}  |  "
            f"Actual Labels: {actual_labels}"
        )
    print()
