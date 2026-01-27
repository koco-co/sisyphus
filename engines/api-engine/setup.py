"""Sisyphus API Engine - Setup Configuration."""
import setuptools


def read_long_description():
    """Read README.md for long description."""
    try:
        with open("README.md", "r", encoding="utf-8") as fh:
            return fh.read()
    except FileNotFoundError:
        return "Sisyphus - Enterprise-grade API Automation Testing Engine"


setuptools.setup(
    name="SisyphusApiEngine",
    version="2.0.0",
    author="Sisyphus Testing Platform",
    author_email="admin@sisyphus.com",
    description="Sisyphus - Enterprise-grade API Automation Testing Engine",
    license="MIT",
    long_description=read_long_description(),
    long_description_content_type="text/markdown",
    url="https://github.com/sisyphus-testing/api-engine",
    project_urls={
        "Bug Tracker": "https://github.com/sisyphus-testing/api-engine/issues",
        "Documentation": "https://github.com/sisyphus-testing/api-engine/wiki",
        "Source Code": "https://github.com/sisyphus-testing/api-engine",
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Testing",
    ],
    install_requires=[
        "Jinja2>=3.0.0",
        "jsonpath>=0.82",
        "PyYAML>=6.0",
        "pyyaml-include>=1.3",
        "requests>=2.28.0",
        "httpx>=0.24.0",
        "PyMySQL>=1.0.0",
        "SQLAlchemy>=2.0.0",
        "asyncio>=3.4.3",
        "typing-extensions>=4.5.0",
        "python-dateutil>=2.8.0",
    ],
    packages=setuptools.find_packages(exclude=["tests", "tests.*", "examples", "examples.*"]),
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "sisyphus-engine=apisix.cli:main",
        ],
    },
    zip_safe=False,
    keywords="api testing automation yaml json mock concurrent",
    include_package_data=True,
)
