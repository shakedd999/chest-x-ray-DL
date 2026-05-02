from typing import List

import tensorflow as tf
import numpy as np
from PIL import Image
import gdown
import os

from POC.model.inference.trained_model_parameters import *


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


def get_prediction(image_path: str) -> List[str]:
    """
    Predicts the chest disease of an image if exists.
    :param image_path: Path to the image location.
    :return: List of predictions or ['Normal'] if no disease has been found. The model_predictions can be of the
             following types: 'Infiltration', 'Effusion' and 'Atelectasis'. There may be several predictions.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"The file '{image_path}' does not exist")

    img = Image.open(image_path)
    processed_img = preprocess_xray(img)

    model_numerical_predictions = model.predict(processed_img)[0] # return the model predictions

    model_thresholds = np.array(THRESHOLDS_FOR_PREDICTIONS)
    result = list((model_numerical_predictions - model_thresholds > 0).astype(int))

    model_predictions = [class_name for index, class_name in CLASSES.items() if result[index] == 1]
    if not model_predictions:
        model_predictions = ['Normal']
    return model_predictions


if __name__ == "__main__":
    download_and_load_the_model()

    current_dir = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.normpath(os.path.join(current_dir, "..", "..", "test_xray_images"))

    try:
        xray_first_image_to_test_path = os.path.join(images_dir, "00000038_006-Atelectasis+Infiltration.png")
        print(f"Image Name: '00000038_006-Atelectasis+Infiltration.png'  |  Model Predictions: "
              f"{get_prediction(xray_first_image_to_test_path)}  |  Actual Labels: ['Atelectasis', 'Infiltration']")

        xray_second_image_to_test_path = os.path.join(images_dir, "00000059_000-Normal.png")
        print(f"Image Name: '00000059_000-Normal.png'  |  Model Predictions: "
              f"{get_prediction(xray_second_image_to_test_path)}  |  Actual Labels: ['Normal']")

        xray_third_image_to_test_path = os.path.join(images_dir, "00000099_012-Effusion.png")
        print(f"Image Name: '00000099_012-Effusion.png'  |  Model Predictions: "
              f"{get_prediction(xray_third_image_to_test_path)}  |  Actual Labels: ['Effusion']")

    except FileNotFoundError:
        print("Prediction Probabilities not found. Please download the model first.")
    print()
